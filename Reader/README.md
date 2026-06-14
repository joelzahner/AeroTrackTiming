# TagReader Core

`TagReaderCore` is a small .NET Framework 4.7.2 library for reading RFID tags from the vendor `ReaderService.dll` over a serial COM port.

The library is intentionally narrow in scope:

- open a reader on a serial port
- verify that the connected device is a supported reader
- optionally switch the B04 antenna routing
- start inventory and raise one event per tag read

## What you need

- Windows
- .NET Framework 4.7.2 developer tools or Visual Studio
- access to a supported RFID reader
- `Dependencies\ReaderService\ReaderService.dll`
- a serial COM port and the correct cable/adapter

## Build

Build the library itself with:

```powershell
dotnet build TagReaderCore\TagReader.Core.csproj -c Debug -p:Platform=x86
```

The `x86` build is the one that was validated in this workspace.

## Integrate into your app

Yes. You can reference the library directly from a WPF, WinForms, or Console app as long as that app also targets .NET Framework 4.7.2 or a compatible framework.

The simplest setup is a project reference to `TagReaderCore\TagReader.Core.csproj`:

1. Open your app project in Visual Studio.
2. Add a project reference to `TagReaderCore\TagReader.Core.csproj`.
3. Keep `Dependencies\ReaderService\ReaderService.dll` in the repository.
4. Create a `ReaderSession`, subscribe to the events, and call `Start()`.

Minimal code:

```csharp
using System;
using TagReader.Core;

var options = new ReaderConnectionOptions
{
    PortName = "COM8",
    BaudRate = 38400,
    AntennaIndex = 1,
    VerifyConnection = true,
    InventoryIntervalMilliseconds = 250
};

using (var session = new ReaderSession(options))
{
    session.StatusMessage += (_, message) => Console.WriteLine(message);
    session.RawFrameReceived += (_, raw) => Console.WriteLine(raw);
    session.TagReadReceived += (_, eventArgs) => Console.WriteLine(eventArgs.TagRead.Epc);

    session.Start();
}
```

If you do not want antenna switching, set `AntennaIndex = 0`.

## How to test the library

The easiest way to test is to create a tiny console app that references the library and prints every event to the terminal.

### 1. Build the library

```powershell
dotnet build TagReaderCore\TagReader.Core.csproj -c Debug -p:Platform=x86
```

### 2. Create a throwaway console app

Create a new console project in a temporary folder and reference `TagReaderCore\TagReader.Core.csproj`.

Using an existing Visual Studio solution is also fine. The only requirement is that the test app can reference the library and load `Dependencies\ReaderService\ReaderService.dll`.

### 3. Use this smoke-test code

```csharp
using System;
using TagReader.Core;

internal static class Program
{
    private static void Main()
    {
        var options = new ReaderConnectionOptions
        {
            PortName = "COM8",
            BaudRate = 38400,
            Parity = System.IO.Ports.Parity.None,
            DataBits = 8,
            StopBits = System.IO.Ports.StopBits.One,
            InventoryIntervalMilliseconds = 250,
            VerifyConnection = true,
            AntennaIndex = 1
        };

        using (var session = new ReaderSession(options))
        {
            session.StatusMessage += (_, message) => Console.WriteLine("[STATUS] " + message);
            session.RawFrameReceived += (_, raw) => Console.WriteLine("[RAW] " + raw);
            session.TagReadReceived += (_, eventArgs) =>
            {
                TagRead tag = eventArgs.TagRead;
                Console.WriteLine("[TAG] EPC=" + tag.Epc + " PC=" + tag.Pc + " CRC=" + tag.Crc);
            };

            session.Start();
            Console.WriteLine("Press Enter to stop.");
            Console.ReadLine();
            session.Stop();
        }
    }
}
```

### 4. Run it against the reader

Start with the known working settings from your setup:

- `PortName = COM8`
- `BaudRate = 38400`
- `AntennaIndex = 1`

If you only want to check the handshake and leave the current antenna unchanged, set `AntennaIndex = 0`.

## Expected output

When the reader responds correctly, you should see messages like:

```text
[STATUS] Opening COM8 at 38400 baud...
[STATUS] Reader verified on COM8.
[STATUS] Selecting antenna 1 (GPIO 72)...
[STATUS] Inventory loop started.
[RAW] ...
[TAG] EPC=...
```

If no tags are present in the field, you may still see the status lines but no `[TAG]` output.

## Settings

`ReaderConnectionOptions` controls the connection.

- `PortName`: required COM port
- `BaudRate`: serial baud rate, default `38400`
- `Parity`: serial parity, default `None`
- `DataBits`: serial data bits, default `8`
- `StopBits`: serial stop bits, default `One`
- `InventoryIntervalMilliseconds`: time between inventory requests, default `250`
- `VerifyConnection`: when `true`, sends `CommandV()` before inventory starts
- `AntennaIndex`: `0` keeps the current antenna, `1..4` map to B04 GPIO routing

### B04 antenna mapping

- `1` -> GPIO `72`
- `2` -> GPIO `71`
- `3` -> GPIO `73`
- `4` -> GPIO `70`

## Events

- `StatusMessage`: human-readable lifecycle messages
- `RawFrameReceived`: raw normalized reader frames
- `TagReadReceived`: parsed `TagRead` values

## Troubleshooting

### The reader does not verify

- confirm the COM port number
- confirm the baud rate
- try `AntennaIndex = 0` to skip GPIO switching
- if the device still answers with noise first, retry the test once more

### The reader verifies but no tags appear

- make sure a tag is actually in range
- confirm the antenna is connected to the expected B04 input
- test `AntennaIndex = 1` through `4` one by one

### The build fails because a DLL is locked

- close any running test app or old executable instance
- rebuild after stopping the process that is holding `TagReader.Core.dll`

## Notes

- The library is focused on tag inventory only.
- It does not include the old GUI sample or the old console runner anymore.