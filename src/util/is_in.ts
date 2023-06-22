/**
 * Type guard function to check if a property exists in an object.
 * 
 * @template T - The type of the object. Must extend object.
 * 
 * @param {PropertyKey} key - The property key to check.
 * @param {T} obj - The object in which to check for the property.
 * 
 * @returns {boolean} - True if the property exists in the object, false otherwise.
 * 
 * If true, the TypeScript type of `key` is narrowed to be a keyof `T`, 
 * indicating it exists as a property within the object `T`.
 */
export function is_in<T extends Object>(
    key: PropertyKey, obj: T
): key is keyof T {
    return key in obj;
}