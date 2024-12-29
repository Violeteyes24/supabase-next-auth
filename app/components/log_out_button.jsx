export default function LogOutButton({ handleLogout }) {
    return (
        <div className="h-screen flex flex-col justify-center items-center bg-gray-100">
            <div className="bg-white dark:bg-gray-900 p-8 rounded-lg shadow-md w-96 text-center">
                <h1 className="mb-4 text-xl font-bold text-gray-700 dark:text-gray-300">
                    You're already logged in
                </h1>
                <button
                    onClick={handleLogout} // Use the passed-in handleLogout function
                    className="w-full p-3 rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

// when you've already logged in, and decided to go to /login or /sign up page, there will be an error since you already have a session.
