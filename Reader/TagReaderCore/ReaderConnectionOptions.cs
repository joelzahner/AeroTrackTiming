using System;
using System.IO.Ports;

namespace TagReader.Core
{
    /// <summary>
    /// Connection and inventory settings for <see cref="ReaderSession"/>.
    /// </summary>
    public sealed class ReaderConnectionOptions
    {
        /// <summary>
        /// Serial port name, for example <c>COM8</c>.
        /// </summary>
        public string PortName { get; set; }

        /// <summary>
        /// Serial baud rate.
        /// </summary>
        public int BaudRate { get; set; } = 38400;

        /// <summary>
        /// B04 antenna selector. Use <c>0</c> to keep the current antenna.
        /// </summary>
        public int AntennaIndex { get; set; } = 1;

        /// <summary>
        /// Serial parity.
        /// </summary>
        public Parity Parity { get; set; } = Parity.None;

        /// <summary>
        /// Serial data bits.
        /// </summary>
        public int DataBits { get; set; } = 8;

        /// <summary>
        /// Serial stop bits.
        /// </summary>
        public StopBits StopBits { get; set; } = StopBits.One;

        /// <summary>
        /// Delay between inventory requests.
        /// </summary>
        public int InventoryIntervalMilliseconds { get; set; } = 250;

        /// <summary>
        /// Verifies the reader with <c>CommandV()</c> before inventory starts.
        /// </summary>
        public bool VerifyConnection { get; set; } = true;

        public void Validate()
        {
            if (string.IsNullOrWhiteSpace(PortName))
            {
                throw new ArgumentException("A serial port name is required.", nameof(PortName));
            }

            if (BaudRate <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(BaudRate));
            }

            if (AntennaIndex < 0 || AntennaIndex > 4)
            {
                throw new ArgumentOutOfRangeException(nameof(AntennaIndex), "AntennaIndex must be between 0 and 4.");
            }

            if (DataBits <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(DataBits));
            }

            if (InventoryIntervalMilliseconds <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(InventoryIntervalMilliseconds));
            }
        }
    }
}