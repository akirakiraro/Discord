using System.Runtime.InteropServices;
using System.Runtime.InteropServices.Marshalling;

if (args.Length == 0)
{
    Console.Error.WriteLine("uso: windows | pid <hwnd> | capture <pid>");
    return 1;
}

return args[0] switch
{
    "windows" => ListWindows(),
    "pid" => PrintPid(args),
    "capture" => Capture(args),
    _ => Fail($"comando inválido: {args[0]}; esperado windows, pid ou capture"),
};

int PrintPid(string[] args)
{
    if (args.Length < 2 || !long.TryParse(args[1], out var hwnd)) return Fail($"hwnd inválido: {Arg(args, 1)}");
    _ = GetWindowThreadProcessId(new IntPtr(hwnd), out var pid);
    Console.WriteLine(pid);
    return pid == 0 ? 1 : 0;
}

int ListWindows()
{
    EnumWindows((nint hwnd, nint unused) =>
    {
        if (!IsWindowVisible(hwnd)) return true;
        _ = GetWindowThreadProcessId(hwnd, out var pid);
        if (pid == 0 || !GetWindowRect(hwnd, out var rect)) return true;
        if (rect.Right <= rect.Left || rect.Bottom <= rect.Top) return true;
        Console.WriteLine($"{pid} {rect.Left} {rect.Top} {rect.Right} {rect.Bottom}");
        return true;
    }, (nint)0);
    return 0;
}

int Capture(string[] args)
{
    if (args.Length < 2 || !uint.TryParse(args[1], out var pid) || pid == 0) return Fail($"pid inválido: {Arg(args, 1)}");
    var session = LoopbackSession.Start(pid);
    Console.CancelKeyPress += (_, eventArgs) =>
    {
        eventArgs.Cancel = true;
        session.Stop();
    };
    session.Wait();
    return session.Failed ? 1 : 0;
}

int Fail(string message)
{
    Console.Error.WriteLine(message);
    return 1;
}

string Arg(string[] args, int index) => index < args.Length ? args[index] : "";

[DllImport("user32.dll")]
static extern bool EnumWindows(EnumWindowsProc callback, nint lParam);

[DllImport("user32.dll")]
static extern bool IsWindowVisible(nint hwnd);

[DllImport("user32.dll")]
static extern uint GetWindowThreadProcessId(nint hwnd, out uint pid);

[DllImport("user32.dll")]
static extern bool GetWindowRect(nint hwnd, out Rect rect);

delegate bool EnumWindowsProc(nint hwnd, nint lParam);

[StructLayout(LayoutKind.Sequential)]
struct Rect
{
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}

sealed partial class LoopbackSession
{
    readonly ManualResetEventSlim _activated = new(false);
    readonly ManualResetEventSlim _stopped = new(false);
    readonly AutoResetEvent _sampleReady = new(false);
    readonly Stream _output = Console.OpenStandardOutput();
    int _activateHr = unchecked((int)0x80004005);
    IAudioClient? _client;
    IAudioCaptureClient? _capture;
    int _blockAlign = 4;
    int _channels = 2;
    bool _float;
    volatile bool _stop;

    public bool Failed { get; private set; }

    public static LoopbackSession Start(uint pid)
    {
        var session = new LoopbackSession();
        session.Activate(pid);
        return session;
    }

    public void Wait() => _stopped.Wait();

    public void Stop() => _stop = true;

    void Activate(uint pid)
    {
        var activation = new ActivationParams { ActivationType = AudioFlags.ActivationProcessLoopback, TargetProcessId = pid, Mode = AudioFlags.IncludeProcessTree };
        var blob = Marshal.AllocHGlobal(Marshal.SizeOf<ActivationParams>());
        Marshal.StructureToPtr(activation, blob, false);
        var variant = new PropVariantBlob { Vt = 0x41, Size = Marshal.SizeOf<ActivationParams>(), Data = blob };
        var variantPtr = Marshal.AllocHGlobal(Marshal.SizeOf<PropVariantBlob>());
        Marshal.StructureToPtr(variant, variantPtr, false);
        try
        {
            var iid = typeof(IAudioClient).GUID;
            var handler = HandlerThunk.Create(this);
            var hr = NativeAudio.ActivateAudioInterfaceAsync(@"VAD\Process_Loopback", ref iid, variantPtr, handler, out _);
            if (hr < 0) throw new InvalidOperationException($"ActivateAudioInterfaceAsync devolveu 0x{hr:X8}");
            if (!_activated.Wait(TimeSpan.FromSeconds(5))) throw new TimeoutException("ativação do loopback excedeu 5s");
            if (_activateHr < 0 || _client is null || _capture is null) throw new InvalidOperationException($"loopback do pid {pid} falhou: 0x{_activateHr:X8}");
            _client.SetEventHandle(_sampleReady.SafeWaitHandle.DangerousGetHandle());
            if (_client.Start() < 0) throw new InvalidOperationException($"Start do pid {pid} falhou");
            _ = Task.Run(Pump);
        }
        catch (Exception error)
        {
            Failed = true;
            Console.Error.WriteLine(error.Message);
            _stopped.Set();
        }
        finally
        {
            Marshal.FreeHGlobal(blob);
            Marshal.FreeHGlobal(variantPtr);
        }
    }

    public void FinishActivation(int hr, nint punk)
    {
        try
        {
            _activateHr = hr;
            if (hr < 0 || punk == 0) return;
            _client = (IAudioClient?)ComBridge.ComWrappers.GetOrCreateObjectForComInstance(punk, CreateObjectFlags.None);
            if (_client is null || !OpenCapture(punk)) return;
            var captureId = typeof(IAudioCaptureClient).GUID;
            _activateHr = _client.GetService(ref captureId, out var capturePtr);
            _capture = (IAudioCaptureClient?)ComBridge.ComWrappers.GetOrCreateObjectForComInstance(capturePtr, CreateObjectFlags.None);
        }
        catch (Exception error)
        {
            Failed = true;
            _activateHr = unchecked((int)0x80004005);
            Console.Error.WriteLine(error.ToString());
        }
        finally
        {
            _activated.Set();
        }
    }

    void Pump()
    {
        try
        {
            while (!_stop && _sampleReady.WaitOne(200)) Drain();
            _client?.Stop();
        }
        catch (Exception error)
        {
            Failed = true;
            Console.Error.WriteLine(error.Message);
        }
        finally
        {
            _stopped.Set();
        }
    }

    bool OpenCapture(nint punk)
    {
        if (TryEngineMix(punk)) return true;
        var nativeFloat = WaveFormat.Float(AudioFlags.SampleRate, 2);
        if (TryFormat(nativeFloat, AudioFlags.LoopbackFlag | AudioFlags.EventFlag, "float")) return true;
        var convert = AudioFlags.LoopbackFlag | AudioFlags.EventFlag | AudioFlags.AutoConvertFlag;
        if (TryFormat(nativeFloat, convert, "float-convert")) return true;
        return TryFormat(WaveFormat.Pcm(AudioFlags.SampleRate, 2), convert, "pcm-convert");
    }

    bool TryEngineMix(nint punk)
    {
        var hr = RawGetMixFormat(punk, out var mix);
        if (hr < 0 || mix == 0)
        {
            Console.Error.WriteLine($"mix ausente: 0x{hr:X8}");
            return false;
        }
        try
        {
            if (!RememberMix(mix)) return false;
            return Commit(mix, AudioFlags.LoopbackFlag | AudioFlags.EventFlag, "mix");
        }
        finally
        {
            NativeAudio.CoTaskMemFree(mix);
        }
    }

    bool TryFormat(WaveFormat format, uint flags, string path)
    {
        RememberWave(format);
        var ptr = Marshal.AllocHGlobal(Marshal.SizeOf<WaveFormat>());
        try
        {
            Marshal.StructureToPtr(format, ptr, false);
            return Commit(ptr, flags, path);
        }
        finally
        {
            Marshal.FreeHGlobal(ptr);
        }
    }

    bool Commit(nint format, uint flags, string path)
    {
        try
        {
            _activateHr = _client!.Initialize(0, flags, 0, 0, format, 0);
        }
        catch (Exception error)
        {
            _activateHr = error.HResult;
        }
        Console.Error.WriteLine($"init path={path} hr=0x{_activateHr:X8}");
        return _activateHr >= 0;
    }

    bool RememberMix(nint mix)
    {
        var tag = (ushort)Marshal.ReadInt16(mix);
        var channels = Marshal.ReadInt16(mix, 2);
        var rate = Marshal.ReadInt32(mix, 4);
        var align = Marshal.ReadInt16(mix, 12);
        var bits = Marshal.ReadInt16(mix, 14);
        var sub = tag == 0xFFFE ? (uint)Marshal.ReadInt32(mix, 24) : tag;
        Console.Error.WriteLine($"mix tag={tag} sub={sub} ch={channels} rate={rate} bits={bits}");
        var isFloat = sub == 3;
        if (rate != AudioFlags.SampleRate || channels < 1) return false;
        if (!isFloat && (bits != 16 || align != channels * 2)) return false;
        _float = isFloat;
        _channels = channels;
        _blockAlign = align;
        return true;
    }

    void RememberWave(WaveFormat format)
    {
        _float = format.FormatTag == 3;
        _channels = format.Channels;
        _blockAlign = format.BlockAlign;
    }

    static unsafe int RawGetMixFormat(nint client, out nint format)
    {
        var getMix = (delegate* unmanaged<nint, nint*, int>)(*((nint*)(*(nint*)client) + 8));
        nint mix;
        var hr = getMix(client, &mix);
        format = mix;
        return hr;
    }

    byte[] ToPcm16(nint data, int frames, int bytes)
    {
        var pcm = new byte[frames * 4];
        if (data == 0 || (bytes == 0)) return pcm;
        if (!_float)
        {
            Marshal.Copy(data, pcm, 0, Math.Min(bytes, pcm.Length));
            return pcm;
        }
        var samples = new float[frames * _channels];
        Marshal.Copy(data, samples, 0, samples.Length);
        for (var frame = 0; frame < frames; frame += 1)
        {
            var left = samples[frame * _channels];
            var right = _channels > 1 ? samples[frame * _channels + 1] : left;
            WriteSample(pcm, frame * 4, left);
            WriteSample(pcm, frame * 4 + 2, right);
        }
        return pcm;
    }

    static void WriteSample(byte[] pcm, int offset, float sample)
    {
        var scaled = Math.Clamp((int)Math.Round(sample * 32767f), -32768, 32767);
        pcm[offset] = (byte)scaled;
        pcm[offset + 1] = (byte)(scaled >> 8);
    }

    void Drain()
    {
        if (_capture is null) return;
        while (_capture.GetNextPacketSize(out var frames) >= 0 && frames > 0)
        {
            if (_capture.GetBuffer(out var data, out frames, out var flags, out _, out _) < 0) return;
            var bytes = (int)frames * _blockAlign;
            var glitch = (flags & AudioFlags.DiscontinuityFlag) != 0;
            if (glitch) Console.Error.WriteLine($"discontinuity frames={frames}");
            var pcm = glitch ? new byte[frames * 4] : ToPcm16(data, (int)frames, bytes);
            _output.Write(pcm);
            _capture.ReleaseBuffer(frames);
        }
        _output.Flush();
    }
}

static class AudioFlags
{
    public const int IncludeProcessTree = 0;
    public const int ActivationProcessLoopback = 1;
    public const uint LoopbackFlag = 0x00020000;
    public const uint EventFlag = 0x00040000;
    public const uint AutoConvertFlag = 0x80000000;
    public const uint DiscontinuityFlag = 1;
    public const uint SilentFlag = 2;
    public const int SampleRate = 48000;
}

static class ComBridge
{
    public static readonly StrategyBasedComWrappers ComWrappers = new();
}

static class HandlerThunk
{
    static readonly Guid Unknown = new("00000000-0000-0000-C000-000000000046");
    static readonly Guid Handler = new("41D949AB-9862-444A-80F6-C261334DA5EB");

    public static unsafe nint Create(LoopbackSession session)
    {
        _ = NativeAudio.CoInitializeEx(0, 0);
        var ftmHr = NativeAudio.CoCreateFreeThreadedMarshaler(0, out var ftm);
        if (ftmHr < 0) throw new InvalidOperationException($"CoCreateFreeThreadedMarshaler devolveu 0x{ftmHr:X8}");
        var handle = GCHandle.Alloc(session);
        var vtable = (nint*)NativeMemory.Alloc(4, (nuint)sizeof(nint));
        vtable[0] = (nint)(delegate* unmanaged<nint, Guid*, nint*, int>)&QueryInterface;
        vtable[1] = (nint)(delegate* unmanaged<nint, uint>)&AddRef;
        vtable[2] = (nint)(delegate* unmanaged<nint, uint>)&Release;
        vtable[3] = (nint)(delegate* unmanaged<nint, nint, int>)&ActivateCompleted;
        var obj = (nint*)NativeMemory.Alloc(3, (nuint)sizeof(nint));
        obj[0] = (nint)vtable;
        obj[1] = GCHandle.ToIntPtr(handle);
        obj[2] = ftm;
        return (nint)obj;
    }

    [UnmanagedCallersOnly]
    static unsafe int QueryInterface(nint self, Guid* iid, nint* ppv)
    {
        var agile = new Guid("94ea2b94-e9cc-49e0-c0ff-ee64ca8f5b90");
        var marshal = new Guid("00000003-0000-0000-C000-000000000046");
        if (*iid == marshal)
        {
            var ftm = ((nint*)self)[2];
            var ftmTable = *(nint**)ftm;
            var query = (delegate* unmanaged<nint, Guid*, nint*, int>)ftmTable[0];
            return query(ftm, iid, ppv);
        }
        if (*iid == Unknown || *iid == Handler || *iid == agile)
        {
            *ppv = self;
            return 0;
        }
        *ppv = 0;
        return unchecked((int)0x80004002);
    }

    [UnmanagedCallersOnly]
    static uint AddRef(nint self) => 1;

    [UnmanagedCallersOnly]
    static uint Release(nint self) => 1;

    [UnmanagedCallersOnly]
    static int ActivateCompleted(nint self, nint operation)
    {
        unsafe
        {
            var session = (LoopbackSession)GCHandle.FromIntPtr(((nint*)self)[1]).Target!;
            var vtable = *(nint*)operation;
            var getResult = (delegate* unmanaged<nint, int*, nint*, int>)(*((nint*)vtable + 3));
            int activateHr;
            nint punk;
            var hr = getResult(operation, &activateHr, &punk);
            session.FinishActivation(hr < 0 ? hr : activateHr, punk);
            return 0;
        }
    }
}

[GeneratedComInterface]
[Guid("41D949AB-9862-444A-80F6-C261334DA5EB")]
internal partial interface IActivateAudioInterfaceCompletionHandler
{
    void ActivateCompleted(IActivateAudioInterfaceAsyncOperation operation);
}

[GeneratedComInterface]
[Guid("72A22D78-CDE4-431D-B8CC-843A71199B6D")]
internal partial interface IActivateAudioInterfaceAsyncOperation
{
    int GetActivateResult(out int activateResult, out nint activatedInterface);
}

[GeneratedComInterface]
[Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2")]
internal partial interface IAudioClient
{
    int Initialize(int shareMode, uint flags, long bufferDuration, long periodicity, nint format, nint sessionGuid);
    int GetBufferSize(out uint bufferFrames);
    int GetStreamLatency(out long latency);
    int GetCurrentPadding(out uint padding);
    int IsFormatSupported(int shareMode, nint format, out nint closest);
    int GetMixFormat(out nint format);
    int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
    int Start();
    int Stop();
    int Reset();
    int SetEventHandle(nint eventHandle);
    int GetService(ref Guid iid, out nint service);
}

[GeneratedComInterface]
[Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317")]
internal partial interface IAudioCaptureClient
{
    int GetBuffer(out nint data, out uint frames, out uint flags, out ulong devicePosition, out ulong qpcPosition);
    int ReleaseBuffer(uint frames);
    int GetNextPacketSize(out uint frames);
}

[StructLayout(LayoutKind.Sequential)]
struct ActivationParams
{
    public int ActivationType;
    public uint TargetProcessId;
    public int Mode;
}

[StructLayout(LayoutKind.Explicit)]
struct PropVariantBlob
{
    [FieldOffset(0)] public ushort Vt;
    [FieldOffset(8)] public int Size;
    [FieldOffset(16)] public IntPtr Data;
}

[StructLayout(LayoutKind.Sequential, Pack = 2)]
struct WaveFormat
{
    public ushort FormatTag;
    public ushort Channels;
    public uint SamplesPerSecond;
    public uint AverageBytesPerSecond;
    public ushort BlockAlign;
    public ushort BitsPerSample;
    public ushort ExtraSize;

    public static WaveFormat Pcm(int sampleRate, ushort channels) => Packed(1, sampleRate, channels, 16);

    public static WaveFormat Float(int sampleRate, ushort channels) => Packed(3, sampleRate, channels, 32);

    static WaveFormat Packed(ushort tag, int sampleRate, ushort channels, ushort bits)
    {
        var align = (ushort)(channels * bits / 8);
        return new WaveFormat
        {
            FormatTag = tag,
            Channels = channels,
            SamplesPerSecond = (uint)sampleRate,
            AverageBytesPerSecond = (uint)(sampleRate * align),
            BlockAlign = align,
            BitsPerSample = bits,
        };
    }
}

static partial class NativeAudio
{
    [DllImport("ole32.dll")]
    public static extern int CoInitializeEx(nint reserved, uint coinit);

    [DllImport("ole32.dll")]
    public static extern int CoCreateFreeThreadedMarshaler(nint outer, out nint marshaler);

    [DllImport("ole32.dll")]
    public static extern void CoTaskMemFree(nint pointer);

    [DllImport("mmdevapi.dll", ExactSpelling = true)]
    public static extern int ActivateAudioInterfaceAsync(
        [MarshalAs(UnmanagedType.LPWStr)] string device,
        ref Guid iid,
        nint parameters,
        nint handler,
        out nint operation);
}
