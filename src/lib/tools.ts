export const createRandomId = (): string => {
  const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0];
  return uint32.toString(16);
}

export const stringFromTemplateString = (template: string, context: any): string => {
  console.log(template, context)
  const functionCode = "return `" + template + "`";
  return (new Function(...Object.keys(context), functionCode))(...Object.values(context));
}

export const groupBy = <T>(array: T[], predicate: (value: T, index: number, array: T[]) => string) =>
  array.reduce((acc, value, index, array) => {
    (acc[predicate(value, index, array)] ||= []).push(value);
    return acc;
  }, {} as { [key: string]: T[] });

export const arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(arrayBuffer)
  var binary = '';
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const wait = async (ms: number) => new Promise(res => setTimeout(res, ms));