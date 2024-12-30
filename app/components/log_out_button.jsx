export default function LogOutButton({ handleLogout }) {
    return (
        <button
            onClick={handleLogout}
            className={`w-full p-3 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none ${className}`}
        >
            Logout
        </button>
    );
}

// when you've already logged in, and decided to go to /login or /sign up page, there will be an error since you already have a session.
