const jwt=require('jsonwebtoken');
require('dotenv').config()

module.exports=async({email,id,role})=>{
	return await jwt.sign(
		{email:email,
		id:id,
		role:role},
		process.env.JWT_SECRET_KEY,
		{expiresIn:'1m'});
};
