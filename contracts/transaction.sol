// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

contract EthSender {
    uint256 public eth; // Valor mínimo de ETH para transferir

    // Eventos
    event SendStatus(bool success);
    event CallStatus(bool success, bytes data);
    event Transfer(address indexed to, uint256 amount); // Evento para registrar transferencias

    // Constructor para establecer el valor mínimo de transferencia
    constructor(uint256 _eth) payable {
        eth = _eth; // Configura el valor mínimo de ETH (en wei)
    }

    // Función para recibir ETH
    receive() external payable {}

    // Transferencia de ETH
    function transferEthers(address payable _to) public payable {
        require(msg.value >= eth, "Insufficient ETH sent");
        require(address(this).balance >= eth, "Contract does not have enough balance");

        // Intentar transferir ETH
        (bool success, ) = _to.call{value: eth}("");
        require(success, "Transfer failed");

        emit Transfer(_to, eth); // Emitir evento de transferencia
    }

    // Obtener el saldo del contrato
    function getBalanceSender() public view returns (uint) {
        return address(this).balance;
    }
}
