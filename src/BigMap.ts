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
		for(let i=0; i<100; i++) {
			self.shards[i] = new Map<string,T>();
		}
	}

	private getShard(key:string) : Map<string,T> {
		const hash = murmur.v3(key);
		return this.shards[hash % this.shards.length];
	}

	public set(key:string, value:T) : void {
		this.getShard(key).set(key, value);
	}

	public get(key:string) : T | undefined {
		return this.getShard(key).get(key);
	}

	public delete(key:string) : void {
		this.getShard(key).delete(key);
	}

	public size() : number {
		const self = this;
		let total = 0;
		self.shards.forEach(function(shard) {
			total += shard.size;
		})
		return total;
	}

	public maxShardSize() : number {
		const self = this;
		let max = 0;
		self.shards.forEach(function(shard) {
			max = Math.max(max, shard.size);
		})

		return max;
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
