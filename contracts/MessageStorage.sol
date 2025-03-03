// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract MessageStorage {
    string public message;
    address public owner;

    event MessageUpdated(string newMessage);

    constructor(string memory initialMessage) {
        message = initialMessage;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can update the message");
        _;
    }

    function updateMessage(string memory newMessage) public onlyOwner {
        message = newMessage;
        emit MessageUpdated(newMessage);
    }
}
