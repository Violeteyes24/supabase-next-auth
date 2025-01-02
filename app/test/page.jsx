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