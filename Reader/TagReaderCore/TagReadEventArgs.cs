using System;

namespace TagReader.Core
{
    /// <summary>
    /// Event arguments for <see cref="ReaderSession.TagReadReceived"/>.
    /// </summary>
    public sealed class TagReadEventArgs : EventArgs
    {
        /// <summary>
        /// Creates event arguments for a tag read.
        /// </summary>
        public TagReadEventArgs(TagRead tagRead)
        {
            TagRead = tagRead;
        }

        /// <summary>
        /// Parsed tag data.
        /// </summary>
        public TagRead TagRead { get; }
    }
}