import Link from "next/link";

export default function RegisterLinks() { // use the function name when reusing.
    return (
        <div className="flex space-x-2 items-center justify-center">
            <Link
                href={'../register/student'}
                className="w-1/4 p-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 focus:outline-none block text-center"
            >
                Student
            </Link>
            <Link
                href={'../register/counselor'}
                className="w-1/4 p-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 focus:outline-none block text-center"
            >
                Counselor
            </Link>
            <Link
                href={'../register/secretary'}
                className="w-1/4 p-3 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 focus:outline-none block text-center"
            >
                Secretary
            </Link>
        </div>
    );
}
