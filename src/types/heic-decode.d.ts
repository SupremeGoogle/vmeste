/** У `heic-decode` нет своих типов — описана только та часть, что используется. */
declare module "heic-decode" {
  type Decoded = { width: number; height: number; data: Uint8ClampedArray };
  function decode(input: { buffer: ArrayBufferLike | Uint8Array }): Promise<Decoded>;
  export default decode;
}
