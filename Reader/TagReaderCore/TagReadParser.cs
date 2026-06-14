using System;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;

namespace TagReader.Core
{
    internal static class TagReadParser
    {
        private static readonly Regex NonHexPrefix = new Regex("^[^0-9A-Fa-f]+", RegexOptions.Compiled);

        public static string Decode(string data)
        {
            if (string.IsNullOrEmpty(data))
            {
                return string.Empty;
            }

            return data.Replace("\0", string.Empty);
        }

        public static string Decode(byte[] data)
        {
            if (data == null || data.Length == 0)
            {
                return string.Empty;
            }

            string message = Encoding.ASCII.GetString(data);
            return message.Replace("\0", string.Empty);
        }

        public static bool TryParseTag(string message, out TagRead tagRead)
        {
            tagRead = null;

            if (string.IsNullOrWhiteSpace(message))
            {
                return false;
            }

            string normalized = Normalize(message);
            if (string.IsNullOrWhiteSpace(normalized))
            {
                return false;
            }

            string firstField = normalized.Split(new[] { ',' }, 2)[0];
            string hexField = NonHexPrefix.Replace(firstField, string.Empty);

            if (hexField.Length < 12 || hexField.Length % 2 != 0)
            {
                return false;
            }

            if (!hexField.All(IsHexChar))
            {
                return false;
            }

            string pc = hexField.Substring(0, 4).ToUpperInvariant();
            string crc = hexField.Substring(hexField.Length - 4, 4).ToUpperInvariant();
            string epc = hexField.Substring(4, hexField.Length - 8).ToUpperInvariant();

            tagRead = new TagRead(normalized, epc, pc, crc, DateTime.Now);
            return true;
        }

        public static string Normalize(string message)
        {
            if (message == null)
            {
                return string.Empty;
            }

            string normalized = message.Trim();
            normalized = normalized.Replace("\r", string.Empty).Replace("\n", string.Empty).Replace("\0", string.Empty).Trim();

            if (normalized.Length > 0 && (normalized[0] == 'U' || normalized[0] == 'Q'))
            {
                normalized = normalized.Substring(1).Trim();
            }

            return normalized;
        }

        private static bool IsHexChar(char value)
        {
            return (value >= '0' && value <= '9') || (value >= 'a' && value <= 'f') || (value >= 'A' && value <= 'F');
        }
    }
}