document.addEventListener("DOMContentLoaded", async () => {
    const connectWalletBtn = document.getElementById("connectWallet");
    const disconnectWalletBtn = document.getElementById("disconnectWallet");
    const sendTransactionBtn = document.getElementById("sendTransaction");
    const welcomeScreen = document.getElementById("welcome-screen");
    const walletScreen = document.getElementById("wallet-screen");
    const userAddressEl = document.getElementById("userAddress");
    const balanceEl = document.getElementById("balance");
    const balanceUSD = document.getElementById("balanceUSD");
    
    let userAccount = null;
    const ETH_TO_USD = 1900; // Puedes actualizar esto dinámicamente

    async function connectWallet() {
        if (window.ethereum) {
            try {
                const accounts = await ethereum.request({ method: "eth_requestAccounts" });
                userAccount = accounts[0];
                userAddressEl.textContent = userAccount;
                getBalance();
                welcomeScreen.classList.add("hidden");
                walletScreen.classList.remove("hidden");
            } catch (error) {
                alert("Conexión rechazada");
            }
        } else {
            alert("Instala MetaMask para continuar.");
        }
    }

    async function getBalance() {
        if (userAccount) {
            const web3 = new Web3(window.ethereum);
            const balanceWei = await web3.eth.getBalance(userAccount);
            const balanceETH = web3.utils.fromWei(balanceWei, "ether");
            balanceEl.textContent = parseFloat(balanceETH).toFixed(4) + " ETH";
            balanceUSD.textContent = "$" + (parseFloat(balanceETH) * ETH_TO_USD).toFixed(2);
        }
    }

    async function sendTransaction() {
        const recipient = document.getElementById("recipientAddress").value;
        const amount = document.getElementById("ethAmount").value;

        if (!userAccount) return alert("Conéctate a MetaMask primero.");
        if (!recipient || !amount) return alert("Completa los campos.");

        if (!confirm(`¿Confirmar envío de ${amount} ETH a ${recipient}?`)) return;

        const web3 = new Web3(window.ethereum);
        const amountWei = web3.utils.toWei(amount, "ether");

        try {
            const tx = await web3.eth.sendTransaction({
                from: userAccount,
                to: recipient,
                value: amountWei,
                gas: 21000,
            });

            alert("Transacción enviada con éxito. Hash: " + tx.transactionHash);
            getBalance();
        } catch (error) {
            alert("Error en la transacción: " + error.message);
        }
    }

    function disconnectWallet() {
        userAccount = null;
        userAddressEl.textContent = "No conectado";
        balanceEl.textContent = "0 ETH";
        balanceUSD.textContent = "$0.00";
        walletScreen.classList.add("hidden");
        welcomeScreen.classList.remove("hidden");
    }


    connectWalletBtn.addEventListener("click", connectWallet);
    disconnectWalletBtn.addEventListener("click", disconnectWallet);
    sendTransactionBtn.addEventListener("click", sendTransaction);
});
