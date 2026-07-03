/**
 * Attaches a WAV header to raw PCM data.
 * @param {Buffer} pcmData - The raw PCM audio data.
 * @param {number} sampleRate - Sample rate (e.g., 16000)
 * @param {number} numChannels - Number of channels (1 for mono)
 * @param {number} bitsPerSample - Bits per sample (16 or 32)
 * @returns {Buffer} - The complete WAV file buffer.
 */
function createWavFile(pcmData, sampleRate = 16000, numChannels = 1, bitsPerSample = 16) {
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);

    // PCM Data
    pcmData.copy(buffer, 44);

    return buffer;
}

module.exports = { createWavFile };
