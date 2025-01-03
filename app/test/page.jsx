'use client';

import React from 'react';
import DemographicsChart from '../components/report components/demographics';
import FeedbackChart from '../components/report components/user_feedback';

export default function TestPage() {
    return (
        <div style={{ background: '#282c34', height: '100vh', padding: '20px' }}>
            <h1 style={{ color: 'white', textAlign: 'center' }}>Test Page</h1>
            <DemographicsChart />
            <FeedbackChart />
        </div>
    );
}



/*
State variables and functions can be extracted as HOC

UpdatedComponent = HOC(React Component)

Example code:

function UpdatedComponent(OriginalComponent) {
    function NewComponent() {
        const [money, setMoney] = useState(10)
        const handleIncrease = () = > {
            setMoney(money * 2);
        };
        return <OriginalComponent handleIncrease = { handleIncrease } money= { money } />
    }
    return <NewComponent />
}

export default Updated Component

1. Pass props to the function
2. Update "export default" and put UpdatedComponent(function)

import React, { useState } from 'react';
import UpdatedComponent from 'react';

function Person1 ({money, handleIncrease}) {
    return(
        <div>
            <h2> Jimmy is offering ${ money } </h2>
            <button onClick = {handleIncrease}>Increase Money</button>
        </div>
    );
}

export default UpdatedComponent(Person1);

import React, { useState } from 'react';
import UpdatedComponent from 'react';

function Person2 ({money, handleIncrease}) {
    return(
        <div>
            <h2> John is offering ${ money } </h2>
            <button onClick = {handleIncrease}>Increase Money</button>
        </div>
    );
}

export default UpdatedComponent(Person2);


*/