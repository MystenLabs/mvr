const findAllTypeDotMoveNames = (type: string) => {
    const names = new Set();
    const partials = type.split('<').map(x => x.split("::")[0]);

    for(const part of partials) {
        if (part.includes('@')) {
            names.add(part);
        }
    }

    return [...names];
}

const names = findAllTypeDotMoveNames("test@test::demo::demo<another@another::inner::inner<0x5::nested::nested>");
console.log(names);
