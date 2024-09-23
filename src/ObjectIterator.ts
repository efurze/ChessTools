/*
	ObjectIterator reads a json file line-by-line. It assumes the json is in the form:
	{
		"key1" : {object1},
		"key2" : {object2},
		...

	}

	each call to next() returns a [key, object] pair as strings
*/

import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
const fsp = fs.promises;


export class ObjectIterator {

	private fileStream : fs.ReadStream;
	private rl : readline.Interface;
	private currentLine : string = "";
	private lineCount : number = 0;
	private generator : AsyncGenerator<string> | null = null;

	public constructor(inputFile:string) {
	    
	    this.fileStream = fs.createReadStream(inputFile);  

	    this.rl = readline.createInterface({
	        input: this.fileStream,
	        crlfDelay: Infinity,  // Handle both Windows and Unix-style line breaks
	    });
	}

	public async init() : Promise<void> {
		const self = this;
		self.generator = self.initGenerator();
		
		// read until the opening '{'
		await self.readUntil(new RegExp(/{/));
		self.advance(1);
	}

	private async *initGenerator() : AsyncGenerator<string> {
		for await (const line of this.rl) {
			yield line;
		}
	}

	private async readLine() : Promise<string|undefined> {
		if (this.generator !== null) {
			const { value, done } = await this.generator.next();
			this.lineCount ++;
			//console.log("\t\t\tread line: " + value);
			return done ? undefined : value.trim();
		} else {
			return undefined;
		}
	}

	// reads until regex is found, returning everything between current and regex, not including the token.
	// The first character of this.currentLine will be the regex
	private async readUntil(regex : RegExp) : Promise<string|undefined> {
		const self = this;

		//console.log("readUntil " + regex.toString());

		let buffer : string = "";
		let index = self.currentLine.search(regex);
		while (index < 0) {
			buffer += self.currentLine;

			const line = await self.readLine();
			if (line !== undefined) {
				self.currentLine = line;
				index = self.currentLine.search(regex);
			} else {
				return undefined;
			}
		}

		buffer += self.currentLine.slice(0, index);
		self.currentLine = self.currentLine.slice(index);
		return buffer;
	} 

	private advance(count : number) : void {
		this.currentLine = this.currentLine.slice(count);
	}

	private async readObject() : Promise<string | undefined> {
		//console.log("readObject");
		const self = this;
		let object : string = "{";
		let read : string | undefined = await self.readUntil(new RegExp(/{/));
		if (read == undefined) {
			return undefined;
		}
		self.advance(1);
		let depth = 1;
		while (depth > 0) {
			read = await self.readUntil(new RegExp(/[{}]/));
			if (read == undefined) {
				return undefined;
			}
			object += read;
			if (self.currentLine[0] == '{') {
				depth ++;
				//console.log("found '{' depth=" + depth);
			} else if (self.currentLine[0] == '}') {
				depth --;
				//console.log("found '}' depth=" + depth);
			}
			object += self.currentLine[0];
			self.advance(1);
		}
		//console.log("read object: " + object);
		return object;
	}

	private async readKeyValue() : Promise<string[] | undefined> {
		let key : string | undefined = await this.readUntil(new RegExp(/:/));
		//console.log("read key: " + key);

		if (key == undefined) {
			return undefined;
		}
		key = key.replace(/[,'"]/g, "").trim();

		
		// advance past ":"
		this.advance(1);

		const value = await this.readObject();
		if (!value) {
			return undefined;
		}

		//console.log("read value: " + value);
		return [key.trim(), value.trim()];
	}


	// this assumes we're at the start of a new hash entry: "key": {},
	public async next() : Promise<string[] | undefined> {
		const self = this;
		const ret : string[] | undefined = await self.readKeyValue();
		return ret;
	}
}

/*
async function runScript() : Promise<void> {
	let it = new ObjectIterator("./test.json");
	await it.init();
	let res : string[] | undefined = [];
	while((res = await it.next()) !== undefined) {
		//console.log((res[1]));
		console.log(JSON.parse(res[1]));
	}
}

runScript();
*/

