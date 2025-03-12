// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <=0.9.0;
contract Transaction{

 function setTransaction(address payable _recipient, uint256 _amount)public payable {
      (_recipient).transfer(_amount);
 } 
}