import { MutableRefObject, useRef } from "react";


/**

useRefFactory is a custom React hook that creates and returns a mutable ref object
with the initial value set by the provided factory function. If the ref object is
already initialized, it will not be overwritten.
@template T The type of the value contained in the ref object.
@param {() => T} factory_function A function that returns the initial value for the ref object.
@returns {MutableRefObject<T>} A mutable ref object with the initial value set by the provided factory function.
@example
function ExampleComponent() {
const someRef = useRefFactory(() => ({ key: "value" }));
// someRef.current = { key: "value" }
}
*/
export function useRefFactory<T>(factory_function:()=>T): MutableRefObject<T>{
    const result = useRef<T | null>(null);
    if(result.current === null){
        result.current = factory_function()
    }
    return result as MutableRefObject<T>
}