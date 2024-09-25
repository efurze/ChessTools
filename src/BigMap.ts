import * as murmur from 'murmurhash';

/*
interface MyIteratorResult<T> {
    done: boolean;
    value: T | undefined;
}

// Custom Iterator definition
interface MyIterator<T> {
    next(): MyIteratorResult<[string, T]>;
}
*/


export class BigMap<T> {

	private shards : Map<string, T>[] = [];

	constructor() {
		const self = this;
		for(let i=0; i<10; i++) {
			self.shards[i] = new Map<string,T>();
		}
	}

	public set(key:string, value:T) : void {
		const hash:string = murmur.v3(key).toString();
		this.shards[parseInt(hash[0])].set(key, value);
	}

	public get(key:string) : T | undefined {
		const hash:string = murmur.v3(key).toString();
		return this.shards[parseInt(hash[0])].get(key);
	}

	public delete(key:string) : void {
		const hash:string = murmur.v3(key).toString();
		this.shards[parseInt(hash[0])].delete(key);
	}

	public size() : number {
		const self = this;
		let total = 0;
		self.shards.forEach(function(shard) {
			total += shard.size;
		})
		return total;
	}


    /*
	public keys() {
		const self = this;
	    let shardIndex = 0;
	    let it = self.shards[shardIndex.toString()].keys();
	    return {
	      next() : IteratorResult<string>{
	      	let n:IteratorResult<string>;
	      	while ((n = it.next()).done) {
	      		if (shardIndex == 9) {
	      			return {done:true};
	      		} else {
	      			shardIndex ++;
	      			it = self.shards[shardIndex.toString()].keys();
	      		}
	      	}
	      	// prepend the shard number to the key
	      	n.value = shardIndex.toString + n.value;
	      	n.done = false;
	      	return n;
	      },
	      [Symbol.iterator](): Iterator<string> {
	        return this;
	      }
    	}
  	}
  	*/


	
/*
    public keys_fuckyou(): MyIterator<T> {
        const self = this;
	    let shardIndex = 0;
	    let it = self.shards[shardIndex.toString()].keys();

        return {
            next(): MyIteratorResult<[string, T]> {
                let result = it.next();
 
                while (result.done) {

                	if (shardIndex == 9) {
	      				return {value: undefined, done:true};
		      		} else {
		      			shardIndex ++;
		      			it = self.shards[shardIndex.toString()].keys();
		      		}
            	}

                // prepend the shard number to the key
		      	//result.value = shardIndex.toString() + result.value;
	

				return {
	                done: result.done ?? false,
	                value: result.value ? result.value : undefined,
	            };
            },
        };
    }
*/

/*
    public myIterator(): MyIterator<T> {
        const mapIterator = this.shards["0"].entries();

        return {
            next(): MyIteratorResult<[string, T]> {
                const result = mapIterator.next();
                return {
                    done: result.done ?? false,
                    value: result.value ? result.value : undefined,
                };
            },
        };
    }
*/

/*
	public keys() {
		
		const self = this;
	    let shardIndex = 0;
	    let it = self.shards[shardIndex.toString()].keys();

		return {
			[Symbol.iterator](): Iterator<string> {
				return this;
			},

			next(): IteratorResult<string> {
				if (false) {
				  return { value: "", done: false };
				} else {
				  return { value: "", done: true };
				}
			}
		}
	}
*/
	

}
