import * as path from 'path';


export type Expr =
	IntLiteralExpr |
	BooleanLiteralExpr |
	ConstantExpr |
	NegateExpr |
	BitwiseOrExpr;

export interface IntLiteralExpr {
	type: "int-literal";
	value: number;
}

export interface BooleanLiteralExpr {
	type: "boolean-literal";
	value: boolean;
}

export interface ConstantExpr {
	type: "constant";
	interface: string;
	name: string;
}

export interface NegateExpr {
	type: "-";
	args: Expr[];
}

export interface BitwiseOrExpr {
	type: "|";
	args: Expr[];
}

export interface Type {
	name: string;
	isPointer: boolean;
	isConst: boolean;
}

export interface Parameter {
	name: string;
	type: Type;
}

export interface Constant {
	name: string;
	type: Type;
	expr: Expr;
}

export interface Method {
	name: string;
	version: number;
	returnType: Type;
	mayThrow: boolean;
	notImplementedExpr?: Expr;
	parameters: Parameter[];
}

export interface Interface {
	name: string;
	version: number;
	extends?: string;
	constants: Constant[];
	methods: Method[];
	methodsByName: {
		[key: string]: Method;
	};
}

export interface Library {
	interfaces: Interface[];
	interfacesByName: {
		[key: string]: Interface;
	};
}

export function load(filename: string): Library {
	const library: Library = require(path.resolve(filename)).library;

	library.interfacesByName = {};

	for (const intf of library.interfaces) {
		library.interfacesByName[intf.name] = intf;
		intf.methodsByName = {};

		for (let method of intf.methods)
			intf.methodsByName[method.name] = method;
	}

	return library;
}
