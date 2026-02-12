import { Class } from 'type-fest'
import { ModelMetadata } from './model.decorator'
import { PropertyMetadata } from './property.decorator'


const MODEL_METADATA_KEY = 'buka:model'
const PROPERTY_METADATA_KEY = 'buka:property'

export class ModelRegister {
  static setModel(target: Class<any>, metadata: ModelMetadata): void {
    Reflect.defineMetadata(MODEL_METADATA_KEY, metadata, target)
  }

  static getModel(target: Class<any>): ModelMetadata | undefined {
    return Reflect.getMetadata(MODEL_METADATA_KEY, target) as ModelMetadata | undefined
  }

  static setProperty(target: Class<any>, propertyName: string | symbol, metadata: PropertyMetadata): void {
    Reflect.defineMetadata(PROPERTY_METADATA_KEY, metadata, target.prototype, propertyName)
  }

  static getProperty(target: Class<any>, propertyName: string | symbol): PropertyMetadata | undefined {
    return Reflect.getMetadata(PROPERTY_METADATA_KEY, target.prototype, propertyName) as PropertyMetadata | undefined
  }

  static copyProperty(source: Class<any>, target: Class<any>, propertyName: string | symbol): void {
    const metadata = this.getProperty(source, propertyName)
    if (metadata) {
      const modelMetadata = this.addModel(target)

      if (!modelMetadata.propertyKeys.includes(propertyName)) {
        modelMetadata.propertyKeys.push(propertyName)
      }

      this.setProperty(target, propertyName, metadata)
    }
  }

  static addModel(target: Class<any>): ModelMetadata {
    const metadata = this.getModel(target)

    if (!metadata) {
      const metadata: ModelMetadata = {
        propertyKeys: [],
      }

      this.setModel(target, metadata)
      return metadata
    }

    return metadata
  }

  static addProperty(target: Class<any>, propertyName: string | symbol, metadata: PropertyMetadata): void {
    const modelMetadata = this.addModel(target)

    if (!modelMetadata.propertyKeys.includes(propertyName)) {
      modelMetadata.propertyKeys.push(propertyName)
    }

    const propertyMetadata = {
      ...(this.getProperty(target, propertyName) || {}),
      ...metadata,
    } as PropertyMetadata

    this.setProperty(target, propertyName, propertyMetadata)
  }

  /**
   * 判断是否为已注册的 Model
   *
   * @example
   * ```typescript
   * const isModel = ModelRegister.isModel(Class.prototype)
   * ```
   */
  static isModel(target: Class<any>): boolean {
    return !!this.getModel(target)
  }

  /**
   * 获取 Model 的所有属性
   *
   * @example
   * ```typescript
   * const properties = ModelRegister.getProperties(Class.prototype)
   * ```
   */
  static getModelPropertyKeys(target: Class<any>): (string | symbol)[] {
    const metadata = this.getModel(target)
    return metadata ? metadata.propertyKeys : []
  }

  static getProperties(target: Class<any>): PropertyMetadata[] {
    const propertyKeys = this.getModelPropertyKeys(target)

    return propertyKeys
      .map((propertyKey) => this.getProperty(target, propertyKey))
      .filter((property): property is PropertyMetadata => !!property)
  }
}
