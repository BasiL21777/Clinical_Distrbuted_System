//high order func
module.exports=(asyncFnc)=>{
	return(req,res,next)=>{
		asyncFnc(req,res,next).catch((err)=>{
			next(err);
		});
	}
};
// note the coming func is async so will return promise

