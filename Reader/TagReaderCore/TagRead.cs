using System;

namespace TagReader.Core
{
    /// <summary>
    /// Parsed RFID tag data returned by the reader.
    /// </summary>
    public sealed class TagRead
    {
        /// <summary>
        /// Creates a parsed tag record.
        /// </summary>
        public TagRead(string rawMessage, string epc, string pc, string crc, DateTime timestamp)
        {
            RawMessage = rawMessage;
            Epc = epc;
            Pc = pc;
            Crc = crc;
            Timestamp = timestamp;
        }

        /// <summary>
        /// Original normalized frame.
        /// </summary>
        public string RawMessage { get; }

        /// <summary>
        /// EPC data without PC/CRC.
        /// </summary>
        public string Epc { get; }

        /// <summary>
        /// PC field.
        /// </summary>
        public string Pc { get; }

        /// <summary>
        /// CRC field.
        /// </summary>
        public string Crc { get; }

        /// <summary>
        /// Read timestamp.
        /// </summary>
        public DateTime Timestamp { get; }
    }
}