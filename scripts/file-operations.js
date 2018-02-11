const
	_fs = require('fs'),
	_path = require('path'),
	_cp = require('cp')
;


/**
 *
 * @param path
 * @param mode
 * @return {Promise<>}
 */
function fsAccess(path, mode=_fs.constants.R_OK) {
	return new Promise(resolve=>{
		_fs.access(path, mode, err=>{
			resolve(err===null);
		})
	})
}

function fsReadFile(filePath) {
	return new Promise((resolve, reject)=>{
		_fs.readFile(filePath, {encoding: 'utf-8'}, function(err, data){
			if (err) {
				reject(err);
			} else {
				resolve(data);
			}
		});
	})
}

/**
 * Copy `src` to `dest`, in Promise way.
 *
 * @param {String} src
 * @param {String} dest
 * @return {Promise<>}
 */
function cp(src, dest) {
	return new Promise((resolve, reject)=>{
		if(_fs.lstatSync(dest).isDirectory()){
			dest = _path.resolve(dest, "./" + _path.basename(src));
		}

		_cp(src, dest, err=>{
			if(err){
				reject(err);
			} else {
				resolve();
			}
		});
	})
}





module.exports = {
	"fsAccess": fsAccess,
	"fsReadFile": fsReadFile,
	"cp": cp
};
