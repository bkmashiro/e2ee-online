export function createBase64ToHanziMapper(customHanziString) {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const hanziArray = customHanziString.split('');

  if (hanziArray.length !== 64) {
      throw new Error('Custom Hanzi string must contain exactly 64 characters.');
  }

  const base64ToHanziMap = {};
  const hanziToBase64Map = {};

  for (let i = 0; i < 64; i++) {
      const base64Char = base64Chars[i];
      const hanziChar = hanziArray[i];

      base64ToHanziMap[base64Char] = hanziChar;
      hanziToBase64Map[hanziChar] = base64Char;
  }

  return {
      encode: function (base64String) {
          return base64String
              .split('')
              .map(char => base64ToHanziMap[char] || char)
              .join('');
      },
      decode: function (hanziString) {
          return hanziString
              .split('')
              .map(char => hanziToBase64Map[char] || char)
              .join('');
      }
  };
}

// 例子
const customHanziString = '一三上不世中乃五亦以佛依倒僧净减切利即厄受味咒在垢埵增声复多大如婆子实尽度异得心怖恐想意所提揭故无时明是智曰有梦槃死法波涅深灭照'; // 自定义的包含64个汉字的字符串
const mapper = createBase64ToHanziMapper(customHanziString);

const originalBase64String = 'SGVsbG8gd29ybGQhABC'; // 你的原始BASE64字符串，包含非BASE64字符"ABC"
const encodedHanziString = mapper.encode(originalBase64String);
console.log('Encoded Hanzi String:', encodedHanziString);

const decodedBase64String = mapper.decode(encodedHanziString);
console.log('Decoded Base64 String:', decodedBase64String);

export default mapper;