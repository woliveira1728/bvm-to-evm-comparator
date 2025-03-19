// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CounterEvm {
    uint256 private counter;

    event CounterUpdated(uint256 newValue);

    constructor(uint256 initialValue) {
        counter = initialValue;
        emit CounterUpdated(counter);
    }

    function increment() public {
        counter += 1;
        emit CounterUpdated(counter);
    }

    function decrement() public {
        counter -= 1;
        emit CounterUpdated(counter);
    }

    function getCounter() public view returns (uint256) {
        return counter;
    }
}