// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

contract EthSender {
    uint256 eth = 0.1 ether;

    // Eventos
    event sendStatus (bool success);
    event callStatus (bool success, bytes data);

    constructor () payable {}
    receive () external payable {}

    // Transferencia de ETH
    function transferEthers(address payable _to) public payable {
        require(msg.value >= eth);
        _to.transfer(eth);
    }

    function getBalanceSender() public view returns (uint) {
        return address(this).balance;
    }
}
