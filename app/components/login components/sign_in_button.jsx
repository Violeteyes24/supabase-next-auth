export default function SignInButton({ handleSignIn, setError, email, password }) {
    return (
        <button
            onClick={() => handleSignIn(email, password, setError)}
            className="w-full mb-2 p-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
        >
            Sign In
        </button>
    );
}
