using RFID.Service;
using RFID.Service.IInterface.COM;
using RFID.Service.IInterface.COM.Events;
using System;
using System.Globalization;
using System.IO.Ports;
using System.Timers;

namespace TagReader.Core
{
    /// <summary>
    /// Opens a reader connection, starts inventory, and exposes tag events.
    /// </summary>
    public sealed class ReaderSession : IDisposable
    {
        private readonly ReaderConnectionOptions options;
        private readonly ReaderService readerService;
        private readonly ICOM com;
        private readonly Timer inventoryTimer;
        private readonly ICOM.CombineDataEventHandler receiveHandler;
        private bool isRunning;
        private bool awaitingResponse;

        public ReaderSession(ReaderConnectionOptions options)
        {
            this.options = options ?? throw new ArgumentNullException(nameof(options));
            this.options.Validate();

            readerService = new ReaderService();
            com = new ICOM();
            inventoryTimer = new Timer(options.InventoryIntervalMilliseconds);
            inventoryTimer.AutoReset = true;
            inventoryTimer.Elapsed += OnInventoryTimerElapsed;
            receiveHandler = OnReceiveData;
        }

        /// <summary>
        /// Raised for every parsed tag read.
        /// </summary>
        public event EventHandler<TagReadEventArgs> TagReadReceived;

        /// <summary>
        /// Raised for raw normalized frames from the reader.
        /// </summary>
        public event EventHandler<string> RawFrameReceived;

        /// <summary>
        /// Raised for lifecycle and error messages.
        /// </summary>
        public event EventHandler<string> StatusMessage;

        public bool IsRunning
        {
            get { return isRunning; }
        }

        /// <summary>
        /// Opens the serial port, verifies the reader, optionally switches antenna, and starts inventory.
        /// </summary>
        public void Start()
        {
            if (isRunning)
            {
                return;
            }

            RaiseStatus(string.Format(CultureInfo.InvariantCulture, "Opening {0} at {1} baud...", options.PortName, options.BaudRate));

            com.Open(options.PortName, options.BaudRate, options.Parity, options.DataBits, options.StopBits);
            com.CombineDataReceiveEventHandler += receiveHandler;

            if (!com.IsOpen())
            {
                throw new InvalidOperationException("The serial port could not be opened.");
            }

            if (options.VerifyConnection)
            {
                bool verified = false;
                for (int attempt = 0; attempt < 3 && !verified; attempt++)
                {
                    com.Send(readerService.CommandV(), ReaderModule.CommandType.Normal);
                    byte[] verifyResponse = com.Receive();
                    string verifyMessage = TagReadParser.Decode(verifyResponse);

                    if (!string.IsNullOrWhiteSpace(verifyMessage) && verifyMessage.IndexOf("V", StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        verified = true;
                    }
                }

                if (!verified)
                {
                    throw new InvalidOperationException("The port answered, but it did not look like a ReaderService device.");
                }

                RaiseStatus(string.Format(CultureInfo.InvariantCulture, "Reader verified on {0}.", options.PortName));
            }

            if (options.AntennaIndex > 0)
            {
                ApplyAntennaSelection();
            }
            else
            {
                RaiseStatus("Keeping current antenna selection.");
            }

            isRunning = true;
            awaitingResponse = false;
            inventoryTimer.Start();
            RaiseStatus("Inventory loop started.");
        }

        /// <summary>
        /// Stops inventory and closes the serial port.
        /// </summary>
        public void Stop()
        {
            if (!isRunning)
            {
                return;
            }

            inventoryTimer.Stop();
            isRunning = false;
            awaitingResponse = false;

            try
            {
                com.CombineDataReceiveEventHandler -= receiveHandler;
            }
            catch
            {
            }

            try
            {
                com.Close();
            }
            catch
            {
            }

            RaiseStatus("Reader stopped.");
        }

        public void Dispose()
        {
            Stop();
            inventoryTimer.Dispose();
            com.Dispose();
        }

        private void OnInventoryTimerElapsed(object sender, ElapsedEventArgs e)
        {
            if (!isRunning || awaitingResponse)
            {
                return;
            }

            try
            {
                awaitingResponse = true;
                com.Send(readerService.CommandU(), ReaderModule.CommandType.Normal);
            }
            catch (Exception ex)
            {
                awaitingResponse = false;
                RaiseStatus("Inventory send failed: " + ex.Message);
            }
        }

        private void OnReceiveData(object sender, CombineDataReceiveArgumentEventArgs e)
        {
            awaitingResponse = false;

            string message = TagReadParser.Normalize(TagReadParser.Decode(e.Data));
            if (string.IsNullOrWhiteSpace(message))
            {
                return;
            }

            RawFrameReceived?.Invoke(this, message);

            TagRead tagRead;
            if (TagReadParser.TryParseTag(message, out tagRead))
            {
                TagReadReceived?.Invoke(this, new TagReadEventArgs(tagRead));
            }
        }

        private void RaiseStatus(string message)
        {
            StatusMessage?.Invoke(this, message);
        }

        private void ApplyAntennaSelection()
        {
            string gpioPins;

            switch (options.AntennaIndex)
            {
                case 1:
                    gpioPins = "72";
                    break;
                case 2:
                    gpioPins = "71";
                    break;
                case 3:
                    gpioPins = "73";
                    break;
                case 4:
                    gpioPins = "70";
                    break;
                default:
                    throw new ArgumentOutOfRangeException(nameof(options.AntennaIndex));
            }

            RaiseStatus(string.Format(CultureInfo.InvariantCulture, "Selecting antenna {0} (GPIO {1})...", options.AntennaIndex, gpioPins));
            com.Send(readerService.SetGPIOPins(gpioPins), ReaderModule.CommandType.Normal);
        }
    }
}