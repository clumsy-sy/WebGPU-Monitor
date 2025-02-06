import { ResourceTracker } from "../core/ResourceTracker";
/**
 * @class Serializer
 * @brief 序列化器，用于将数据转换为 JSON 格式
 */
export class Serializer {
  // static serialize(data) {
  //   // 递归处理数据
  //   const seen = new WeakSet();
  //   // 使用 JSON.stringify 将数据转换为 JSON 字符串
  //   return JSON.parse(JSON.stringify(data, (key, value) => {
  //     // 如果是循环引用的对象，则返回 "[Circular]"
  //     if (typeof value === 'object' && value !== null) {
  //       if (seen.has(value)) return '[Circular]';
  //       seen.add(value);
        
  //       if (value instanceof ArrayBuffer) {
  //         return { __type: 'ArrayBuffer', byteLength: value.byteLength };
  //       }
        
  //       const resInfo = ResourceTracker.getResourceInfo(value);
  //       if (resInfo) return { $ref: resInfo.id };
  //     }
  //     return value;
  //   }));
  // }
}