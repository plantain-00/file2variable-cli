declare module "vue-template-compiler" {
    function compile(template: string): {
        render: string;
    };
}

declare module "vue-template-es2015-compiler" {
    function transpile(template: string): string;

    export = transpile;
}
