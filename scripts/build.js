import nunjucks from 'nunjucks';
import path from "node:path";
import fs from "fs-extra";


const nunjucksEnv = new nunjucks.Environment([]);
nunjucksEnv.addFilter('wait', function () {}, true);


const templateViews = path.normalize(`${import.meta.dirname}/../webextension/templates`);
fs.writeFileSync(
	path.normalize(`${templateViews}/templates.js`),
	nunjucks.precompile(templateViews, {
		env: nunjucksEnv,
		include: fs.readdirSync(templateViews, { withFileTypes: false }).filter(file => file.endsWith(".njk")),
	}),
	{ encoding: "utf8" }
);
