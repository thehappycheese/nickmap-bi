import { MutableRefObject, useRef } from "react";



export function useRefFactory<T>(factory_function:()=>T): MutableRefObject<T>{
    const result = useRef<T | null>(null);
    if(result.current === null){
        result.current = factory_function()
    }
    return result as MutableRefObject<T>
}