/*
 * public/recorder-processor.js
 *
 * Production AudioWorkletProcessor using a flat accumulator buffer of size 2048.
 * No circular/RingBuffer. No read/write indices wrapping. No mask arithmetic.
 * Accumulates audio frames and sends chunks to the main thread.
 * Only flushes remaining samples and sends "done" on the next process() callback
 * after receiving "flush", guaranteeing that the final render quantum is captured.
 */

const BUFFER_SIZE = 4096;

class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.accumulator = new Float32Array(BUFFER_SIZE);
    this.writePosition = 0;
    this.flushRequested = false;

    this.port.onmessage = (event) => {
      if (event.data && event.data.type === "flush") {
        this.flushRequested = true;
      }
    };
  }

  process(inputs) {
    if (this.flushRequested) {
      const input = inputs[0];
      if (input && input.length > 0) {
        const channel = input[0];
        if (channel && channel.length > 0) {
          const frameLen = channel.length;
          let srcOffset = 0;

          while (srcOffset < frameLen) {
            const space = BUFFER_SIZE - this.writePosition;
            const toCopy = Math.min(space, frameLen - srcOffset);

            this.accumulator.set(channel.subarray(srcOffset, srcOffset + toCopy), this.writePosition);
            this.writePosition += toCopy;
            srcOffset += toCopy;

            if (this.writePosition === BUFFER_SIZE) {
              this.sendSamples(this.accumulator.slice(0));
              this.writePosition = 0;
            }
          }
        }
      }

      this.flushAndDone();
      this.flushRequested = false;
      return true;
    }

    const input = inputs[0];
    if (!input || input.length === 0) {
      return true;
    }

    const channel = input[0];
    if (!channel || channel.length === 0) {
      return true;
    }

    const frameLen = channel.length;
    let srcOffset = 0;

    while (srcOffset < frameLen) {
      const space = BUFFER_SIZE - this.writePosition;
      const toCopy = Math.min(space, frameLen - srcOffset);

      // Copy incoming samples sequentially using subarray/set to avoid memory garbage
      this.accumulator.set(channel.subarray(srcOffset, srcOffset + toCopy), this.writePosition);
      this.writePosition += toCopy;
      srcOffset += toCopy;

      if (this.writePosition === BUFFER_SIZE) {
        this.sendSamples(this.accumulator.slice(0));
        this.writePosition = 0;
      }
    }

    return true;
  }

  sendSamples(samplesCopy) {
    this.port.postMessage({
      type: "samples",
      samples: samplesCopy
    });
  }

  sendDone() {
    try {
      this.port.postMessage({
        type: "done"
      });
    } catch (err) {
      console.warn("AudioWorklet failed to post done event:", err);
    }
  }

  flushAndDone() {
    if (this.writePosition > 0) {
      const remainingSamples = this.accumulator.slice(0, this.writePosition);
      this.sendSamples(remainingSamples);
      this.writePosition = 0;
    }
    this.sendDone();
  }
}

registerProcessor("recorder-processor", RecorderProcessor);