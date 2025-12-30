export function slugify(str) {
	return str.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '').toLowerCase()
		.replace(/\W+/g, '-')
		.replace(/(-{2,}|-$)/g, '');
}