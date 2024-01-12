Object.fromEntries(
	new Map([...
		document.querySelectorAll('meta[property^="og:"]')]
			.map(node => {
				return [
					node.getAttribute('property')?.substring(3),
					node.content
				]
			})
	)
);