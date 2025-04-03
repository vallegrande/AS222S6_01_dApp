document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded - initializing wallet app");
    
    // Referencias a elementos del DOM
    const connectWalletBtn = document.getElementById("connectWallet");
    const disconnectWalletBtn = document.getElementById("disconnectWallet");
    const sendTransactionBtn = document.getElementById("sendTransaction");
    const welcomeScreen = document.getElementById("welcome-screen");
    const walletScreen = document.getElementById("wallet-screen");
    const userAddressEl = document.getElementById("userAddress");
    const balanceEl = document.getElementById("balance");
    const balanceUSD = document.getElementById("balanceUSD");
    const historyList = document.getElementById("historyList");

    // Variables de estado
    let userAccount = null;
    const ETH_TO_USD = 1900; // Valor estático (podría actualizarse con API)
    let transactionHistory = [];

    // Comprobar elementos críticos
    if (!connectWalletBtn) console.error("Connect wallet button not found!");
    if (!disconnectWalletBtn) console.error("Disconnect wallet button not found!");
    if (!sendTransactionBtn) console.error("Send transaction button not found!");

    // Conectar a MetaMask
    async function connectWallet() {
        console.log("Connect button clicked");
        
        if (window.ethereum) {
            try {
                console.log("MetaMask detected, requesting accounts...");
                const accounts = await ethereum.request({ method: "eth_requestAccounts" });
                userAccount = accounts[0];
                console.log("Connected to account:", userAccount);
                
                userAddressEl.textContent = userAccount;
                await getBalance();
                
                // Cambiar pantallas
                welcomeScreen.classList.add("hidden");
                walletScreen.classList.remove("hidden");
                
                console.log("Wallet screen displayed");
            } catch (error) {
                console.error("Connection rejected:", error);
                alert("Conexión rechazada");
            }
        } else {
            console.error("MetaMask not installed");
            alert("Instala MetaMask para continuar.");
        }
    }

    // Obtener balance
    async function getBalance() {
        if (userAccount) {
            try {
                console.log("Getting balance for:", userAccount);
                const web3 = new Web3(window.ethereum);
                const balanceWei = await web3.eth.getBalance(userAccount);
                const balanceETH = web3.utils.fromWei(balanceWei, "ether");
                
                balanceEl.textContent = parseFloat(balanceETH).toFixed(4) + " ETH";
                balanceUSD.textContent = "$" + (parseFloat(balanceETH) * ETH_TO_USD).toFixed(2);
                
                console.log("Balance updated:", balanceETH, "ETH");
            } catch (error) {
                console.error("Error getting balance:", error);
            }
        }
    }

    // Enviar transacción
    async function sendTransaction() {
        console.log("Send transaction button clicked");
        
        const recipient = document.getElementById("recipientAddress").value;
        const amount = document.getElementById("ethAmount").value;

        if (!userAccount) {
            console.error("No account connected");
            return alert("Conéctate a MetaMask primero.");
        }
        
        if (!recipient || !amount) {
            console.error("Missing fields");
            return alert("Completa los campos.");
        }

        if (!confirm(`¿Confirmar envío de ${amount} ETH a ${recipient}?`)) {
            console.log("Transaction cancelled by user");
            return;
        }

        const web3 = new Web3(window.ethereum);
        const amountWei = web3.utils.toWei(amount, "ether");

        try {
            console.log(`Sending ${amount} ETH to ${recipient}`);
            
            const tx = await web3.eth.sendTransaction({
                from: userAccount,
                to: recipient,
                value: amountWei,
                gas: 21000,
            });

            console.log("Transaction sent:", tx.transactionHash);
            alert("Transacción enviada con éxito. Hash: " + tx.transactionHash);
            
            saveTransaction(recipient, amount);
            await getBalance();
        } catch (error) {
            console.error("Transaction error:", error);
            alert("Error en la transacción: " + error.message);
        }
    }

    // Guardar transacción en historial
    function saveTransaction(recipient, amount) {
        const now = new Date();
        const formattedDate = now.toLocaleString();
        
        console.log("Saving transaction to history:", amount, "ETH to", recipient);
        
        // Agregar la transacción al historial
        transactionHistory.unshift({ recipient, amount, date: formattedDate });

        // Actualizar la lista en la interfaz
        updateTransactionHistory();
    }

    // Actualizar interfaz del historial
    function updateTransactionHistory() {
        console.log("Updating transaction history UI");
        historyList.innerHTML = ""; // Limpiar lista antes de actualizar

        transactionHistory.forEach(tx => {
            const listItem = document.createElement("li");
            listItem.innerHTML = `<strong>${tx.amount} ETH</strong> enviado a <strong>${tx.recipient}</strong> el <em>${tx.date}</em>`;
            historyList.appendChild(listItem);
        });
    }

    // Desconectar wallet
    function disconnectWallet() {
        console.log("Disconnect button clicked");
        
        userAccount = null;
        userAddressEl.textContent = "No conectado";
        balanceEl.textContent = "0 ETH";
        balanceUSD.textContent = "$0.00";
        
        // Cambiar pantallas
        walletScreen.classList.add("hidden");
        welcomeScreen.classList.remove("hidden");
        
        transactionHistory = [];
        updateTransactionHistory();
        
        console.log("Returned to welcome screen");
    }

    // Event listeners
    console.log("Setting up event listeners");
    
    connectWalletBtn.addEventListener("click", connectWallet);
    console.log("Connect wallet button listener added");
    
    disconnectWalletBtn.addEventListener("click", disconnectWallet);
    console.log("Disconnect wallet button listener added");
    
    sendTransactionBtn.addEventListener("click", sendTransaction);
    console.log("Send transaction button listener added");
    
    console.log("Ciskoi wallet app initialized");
});