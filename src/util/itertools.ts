export function zip_arrays<T,U>(a:T[],b:U[]):[T,U][]{
    const zippedArray: [T, U][] = [];
    const minLength = Math.min(a.length, b.length);
    for (let i = 0; i < minLength; i++) {
        zippedArray.push([a[i], b[i]]);
    }
    return zippedArray;
}

export function * zip_iterators<T,U>(a:Iterator<T>, b:Iterator<U>):Generator<[T,U]>{
    while (true) {
        const nextA = a.next();
        const nextB = b.next();
    
        if (nextA.done || nextB.done) {
            // If either generator is done, exit the loop
            return;
        }
    
        yield [nextA.value, nextB.value];
    }
}