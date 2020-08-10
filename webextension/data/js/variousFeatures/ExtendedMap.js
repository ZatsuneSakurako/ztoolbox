class ExtendedMap extends Map {
	addValue(id, newValue) {
		this.set(id, this.get(id) + newValue);
	}

	getBestIcon(){
		// Map must be a Map of items like ["64x64",<url>]
		let bestIconMinSize = 0;
		let bestUrl = "";
		this.forEach((value, index) => {
			let sizes = index.split("x");
			if(sizes.length === 2){
				let minSize = Math.min(sizes[0],sizes[1]);
				if(minSize > bestIconMinSize){
					bestIconMinSize = minSize;
					bestUrl = value;
				}
			}
		});
		return bestUrl;
	}
}

export {
	ExtendedMap
}