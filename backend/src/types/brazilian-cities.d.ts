declare module 'brazilian-cities/dist/states-and-cities' {
    const data: Array<{
        cod: string;
        label: string;
        cities: Array<{ label: string }>;
    }> | { default: Array<{ cod: string; label: string; cities: Array<{ label: string }> }> };
    export default data;
}
