// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CounterEvm {
    int256 private counter;

    event CounterUpdated(int256 newValue);

    constructor(int256 initialValue) {
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

    function getCounter() public view returns (int256) {
        return counter;
    }
}