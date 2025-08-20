import {Link }from 'react-router-dom';


const Navbar = () => {
  return (
    <nav className="w-full  px-6 py-4 flex items-center justify-between">

      <div className="text-4xl text-black font-bebas tracking-wide cursor-pointer">
        Careio
      </div>
   
      <div className="flex items-center gap-4">
        <Link to= "/login" className="px-4 py-2 text-sm font-medium font-bebas text-black hover:text-gray-700 transition-colors">
          Sign In
        </Link>
        <Link to="/signup" className="px-4 py-2 text-sm font-medium font-bebas text-black bg-white rounded-lg hover:bg-black hover:text-white transition-colors">
          Sign Up
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;

