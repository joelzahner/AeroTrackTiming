using System;
using System.Globalization;
using System.Linq;
using TagReader.Core;

namespace ReaderBridge
{
    /// <summary>
    /// Console bridge that forwards RFID tag reads as JSON lines to stdout.
    /// Launched by the Node.js server as a child process.
    /// 
    /// Usage:
    ///   ReaderBridge.exe --port COM8 --baud 38400 --antenna 1
    /// 
    /// Output format (one JSON object per line):
    ///   {"type":"tag","epc":"E28011606000020B15000812","pc":"3000","crc":"ABCD","rssi":-52,"timestamp":"2026-06-13T18:30:00.1234567"}
    ///   {"type":"status","message":"Reader verified on COM8."}
    ///   {"type":"error","message":"The serial port could not be opened."}
    /// </summary>
    internal static class Program
    {
        private static void Main(string[] args)
        {
            string port = "COM8";
            int baud = 38400;
            int antenna = 1;

            // Parse command line arguments
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--port" && i + 1 < args.Length)
                {
                    port = args[i + 1];
                    i++;
                }
                else if (args[i] == "--baud" && i + 1 < args.Length)
                {
                    int.TryParse(args[i + 1], out baud);
                    i++;
                }
                else if (args[i] == "--antenna" && i + 1 < args.Length)
                {
                    int.TryParse(args[i + 1], out antenna);
                    i++;
                }
            }

            WriteJson("status", string.Format("Starting bridge on {0} at {1} baud, antenna {2}", port, baud, antenna));

            try
            {
                var options = new ReaderConnectionOptions
                {
                    PortName = port,
                    BaudRate = baud,
                    AntennaIndex = antenna,
                    VerifyConnection = true,
                    InventoryIntervalMilliseconds = 250
                };

                using (var session = new ReaderSession(options))
                {
                    session.StatusMessage += (sender, message) =>
                    {
                        WriteJson("status", message);
                    };

                    session.TagReadReceived += (sender, eventArgs) =>
                    {
                        TagRead tag = eventArgs.TagRead;
                        string json = string.Format(
                            CultureInfo.InvariantCulture,
                            "{{\"type\":\"tag\",\"epc\":\"{0}\",\"pc\":\"{1}\",\"crc\":\"{2}\",\"timestamp\":\"{3}\"}}",
                            EscapeJson(tag.Epc),
                            EscapeJson(tag.Pc),
                            EscapeJson(tag.Crc),
                            tag.Timestamp.ToString("o", CultureInfo.InvariantCulture)
                        );
                        Console.WriteLine(json);
                        Console.Out.Flush();
                    };

                    session.Start();
                    WriteJson("status", "Bridge running. Waiting for tags...");

                    // Keep running until stdin is closed (Node.js kills the process)
                    // or until user presses Enter (manual testing)
                    while (true)
                    {
                        string line = Console.ReadLine();
                        if (line == null || line.Trim().ToUpperInvariant() == "QUIT")
                        {
                            break;
                        }
                    }

                    session.Stop();
                    WriteJson("status", "Bridge stopped gracefully.");
                }
            }
            catch (Exception ex)
            {
                string errorJson = string.Format(
                    CultureInfo.InvariantCulture,
                    "{{\"type\":\"error\",\"message\":\"{0}\"}}",
                    EscapeJson(ex.Message)
                );
                Console.WriteLine(errorJson);
                Console.Out.Flush();
                Environment.ExitCode = 1;
            }
        }

        private static void WriteJson(string type, string message)
        {
            string json = string.Format(
                CultureInfo.InvariantCulture,
                "{{\"type\":\"{0}\",\"message\":\"{1}\"}}",
                EscapeJson(type),
                EscapeJson(message)
            );
            Console.WriteLine(json);
            Console.Out.Flush();
        }

        private static string EscapeJson(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            return value
                .Replace("\\", "\\\\")
                .Replace("\"", "\\\"")
                .Replace("\n", "\\n")
                .Replace("\r", "\\r")
                .Replace("\t", "\\t");
        }
    }
}
