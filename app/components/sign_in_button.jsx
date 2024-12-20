export default function SignInButton({ handleSignIn }) {
    
    return (
        <button
            onClick={handleSignIn}
            className="w-full mb-2 p-3 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none"
        >
            Sign In
        </button>
    );
}
