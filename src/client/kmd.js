const client = require('./client');
const txn = require("../transaction");

function Kmd(token, baseServer = "http://127.0.0.1", port = 7833) {
    // Get client
    let c = new client.HTTPClient({'X-KMD-API-Token':token}, baseServer, port);

    /**
     * version returns a VersionResponse containing a list of kmd API versions supported by this running kmd instance.
     * @returns {Promise<*>}
     */
    this.versions = async function () {
        let res = await c.get("/versions");
        return res.body;
    };

    /**
     * listWallets returns a ListWalletsResponse containing the list of wallets known to kmd. Using a wallet ID
     * returned from this endpoint, you can initialize a wallet handle with client.InitWalletHandle
     * @returns {Promise<*>}
     */
    this.listWallets = async function () {
        let res = await c.get("/v1/wallets");
        return res.body;
    };

    /**
     * createWallet creates a wallet with the specified name, password, driver,
     * and master derivation key. If the master derivation key is blank, one is
     * generated internally to kmd. CreateWallet returns a CreateWalletResponse
     * containing information about the new wallet.
     * @param walletName
     * @param walletPassword
     * @param walletDriverName
     * @param walletMDK
     * @returns {Promise<*>}
     */
    this.createWallet = async function (walletName, walletPassword, walletMDK = "", walletDriverName = "sqlite") {
        let req = {
            "wallet_name": walletName,
            "wallet_driver_name": walletDriverName,
            "wallet_password": walletPassword,
            "master_derivation_key": Buffer.from(walletMDK).toString('base64'),
        };
        let res = await c.post("/v1/wallet", req);
        return res.body;
    };

    /**
     * initWalletHandle accepts a wallet ID and a wallet password, and returns an
     * initWalletHandleResponse containing a wallet handle token. This wallet
     * handle token can be used for subsequent operations on this wallet, like key
     * generation, transaction signing, etc.. WalletHandleTokens expire after a
     * configurable number of seconds, and must be renewed periodically with
     * RenewWalletHandle. It is good practice to call ReleaseWalletHandle when
     * you're done interacting with this wallet.
     * @param walletID
     * @param walletPassword
     * @returns {Promise<*>}
     */
    this.initWalletHandle = async function (walletID, walletPassword) {
        let req = {
            "wallet_id": walletID,
            "wallet_password": walletPassword,

        };
        let res = await c.post("/v1/wallet/init", req);
        return res.body;
    };

    /**
     * releaseWalletHandle invalidates the passed wallet handle token, making
     * it unusuable for subsequent wallet operations.
     * @param walletHandle
     * @returns {Promise<*>}
     */
    this.releaseWalletHandle = async function (walletHandle) {
        let req = {
            "wallet_handle_token": walletHandle,
        };
        let res = await c.post("/v1/wallet/release", req);
        return res.body;
    };

    /**
     * renewWalletHandle accepts a wallet handle and attempts to renew it, moving
     * the expiration time to some number of seconds in the future. It returns a
     * RenewWalletHandleResponse containing the walletHandle and the number of
     * seconds until expiration
     * @param walletHandle
     * @returns {Promise<*>}
     */
    this.renewWalletHandle = async function (walletHandle) {
        let req = {
            "wallet_handle_token": walletHandle,
        };
        let res = await c.post("/v1/wallet/renew", req);
        return res.body;
    };

    /**
     * renameWallet accepts a wallet ID, wallet password, and a new wallet name,
     * and renames the underlying wallet.
     * @param walletID
     * @param walletPassword
     * @param newWalletName
     * @returns {Promise<*>}
     */
    this.renameWallet = async function (walletID, walletPassword, newWalletName) {
        let req = {
            "wallet_id": walletID,
            "wallet_password": walletPassword,
            "wallet_name": newWalletName

        };
        let res = await c.post("/v1/wallet/rename", req);
        return res.body;
    };

    /**
     * getWallet accepts a wallet handle and returns high level information about
     * this wallet in a GetWalletResponse.
     * @param walletHandle
     * @returns {Promise<*>}
     */
    this.getWallet = async function (walletHandle) {
        let req = {
            "wallet_handle_token": walletHandle,
        };
        let res = await c.post("/v1/wallet/info", req);
        return res.body;
    };

    /**
     * exportMasterDerivationKey accepts a wallet handle and a wallet password, and
     * returns an ExportMasterDerivationKeyResponse containing the master
     * derivation key. This key can be used as an argument to CreateWallet in
     * order to recover the keys generated by this wallet. The master derivation
     * key can be encoded as a sequence of words using the mnemonic library, and
     * @param walletHandle
     * @param walletPassword
     * @returns {Promise<*>}
     */
    this.exportMasterDerivationKey = async function (walletHandle, walletPassword) {
        let req = {
            "wallet_handle_token": walletHandle,
            "wallet_password": walletPassword,
        };
        let res = await c.post("/v1/master-key/export", req);
        return {"master_derivation_key": Buffer.from(res.body.master_derivation_key, 'base64')};
    };


    /**
     * importKey accepts a wallet handle and an ed25519 private key, and imports
     * the key into the wallet. It returns an ImportKeyResponse containing the
     * address corresponding to this private key.
     * @param walletHandle
     * @param secretKey
     * @returns {Promise<*>}
     */
    this.importKey = async function (walletHandle, secretKey) {
        let req = {
            "wallet_handle_token": walletHandle,
            "private_key": Buffer.from(secretKey).toString('base64'),
        };
        let res = await c.post("/v1/key/import", req);
        return res.body;
    };

    /**
     * exportKey accepts a wallet handle, wallet password, and address, and returns
     * an ExportKeyResponse containing the ed25519 private key corresponding to the
     * address stored in the wallet.
     * @param walletHandle
     * @param walletPassword
     * @param addr
     * @returns {Promise<*>}
     */
    this.exportKey = async function (walletHandle, walletPassword, addr) {
        let req = {
            "wallet_handle_token": walletHandle,
            "address": addr,
            "wallet_password": walletPassword
        };
        let res = await c.post("/v1/key/export", req);
        return {"private_key": Buffer.from(res.body.private_key, 'base64')};
    };

    /**
     * generateKey accepts a wallet handle, and then generates the next key in the
     * wallet using its internal master derivation key. Two wallets with the same
     * master derivation key will generate the same sequence of keys.
     * @param walletHandle
     * @returns {Promise<*>}
     */
    this.generateKey = async function (walletHandle) {
        let req = {
            "wallet_handle_token": walletHandle,
            "display_mnemonic": false
        };
        let res = await c.post("/v1/key", req);
        return res.body;
    };

    /**
     * deleteKey accepts a wallet handle, wallet password, and address, and deletes
     * the information about this address from the wallet (including address and
     * secret key). If DeleteKey is called on a key generated using GenerateKey,
     * the same key will not be generated again. However, if a wallet is recovered
     * using the master derivation key, a key generated in this way can be
     * recovered.
     * @param walletHandle
     * @param walletPassword
     * @param addr
     * @returns {Promise<*>}
     */
    this.deleteKey = async function (walletHandle, walletPassword, addr) {
        let req = {
            "wallet_handle_token": walletHandle,
            "address": addr,
            "wallet_password": walletPassword
        };
        let res = await c.delete("/v1/key", req);
        return res.body;
    };

    /**
     * ListKeys accepts a wallet handle and returns a ListKeysResponse containing
     * all of the addresses for which this wallet contains secret keys.
     * @param walletHandle
     * @returns {Promise<*>}
     */
    this.listKeys = async function (walletHandle) {
        let req = {
            "wallet_handle_token": walletHandle,
        };
        let res = await c.post("/v1/key/list", req);
        return res.body;
    };

    /**
     * signTransaction accepts a wallet handle, wallet password, and a transaction,
     * and returns and SignTransactionResponse containing an encoded, signed
     * transaction. The transaction is signed using the key corresponding to the
     * Sender field.
     * @param walletHandle
     * @param walletPassword
     * @param transaction
     * @returns {Promise<*>}
     */
    this.signTransaction = async function (walletHandle, walletPassword, transaction) {

        let tx = new txn.Transaction(transaction);

        let req = {
            "wallet_handle_token": walletHandle,
            "wallet_password": walletPassword,
            "transaction": Buffer.from(tx.toByte()).toString('base64')
        };
        let res = await c.post("/v1/transaction/sign", req);

        if (res.statusCode === 200) {
            return Buffer.from(res.body.signed_transaction, 'base64')
        }
        return res.body;
    };

    /**
     * listMultisig accepts a wallet handle and returns a ListMultisigResponse
     * containing the multisig addresses whose preimages are stored in this wallet.
     * A preimage is the information needed to reconstruct this multisig address,
     * including multisig version information, threshold information, and a list
     * of public keys.
     * @param walletHandle
     * @returns {Promise<*>}
     */
    this.listMultisig = async function (walletHandle) {
        let req = {
            "wallet_handle_token": walletHandle,
        };
        let res = await c.post("/v1/multisig/list", req);
        return res.body;
    };

    /**
     * importMultisig accepts a wallet handle and the information required to
     * generate a multisig address. It derives this address, and stores all of the
     * information within the wallet. It returns a ImportMultisigResponse with the
     * derived address.
     * @param walletHandle
     * @param version
     * @param threshold
     * @param pks
     * @returns {Promise<*>}
     */
    this.importMultisig = async function (walletHandle, version, threshold, pks) {
        let req = {
            "wallet_handle_token": walletHandle,
            "multisig_version": version,
            "threshold": threshold,
            "pks": pks
        };
        let res = await c.post("/v1/multisig/import", req);
        return res.body;
    };

    /**
     * exportMultisig accepts a wallet handle, wallet password, and multisig
     * address, and returns an ExportMultisigResponse containing the stored
     * multisig preimage. The preimage contains all of the information necessary
     * to derive the multisig address, including version, threshold, and a list of
     * public keys.
     * @param walletHandle
     * @param walletPassword
     * @param addr
     * @returns {Promise<*>}
     */
    this.exportMultisig = async function (walletHandle, addr) {
        let req = {
            "wallet_handle_token": walletHandle,
            "address": addr,
        };
        let res = await c.post("/v1/multisig/export", req);
        return res.body;
    };

    /**
     * signMultisigTransaction accepts a wallet handle, wallet password,
     * transaction, public key (*not* an address), and an optional partial
     * MultisigSig. It looks up the secret key corresponding to the public key, and
     * returns a SignMultisigTransactionResponse containing a MultisigSig with a
     * signature by the secret key included.
     * @param walletHandle
     * @param pw
     * @param tx
     * @param pk
     * @param partial
     * @returns {Promise<*>}
     */
    this.signMultisigTransaction = async function (walletHandle, pw, transaction, pk, partial) {
        let tx = new txn.Transaction(transaction);
        let req = {
            "wallet_handle_token": walletHandle,
            "transaction": Buffer.from(tx.toByte()).toString('base64'),
            "public_key": Buffer.from(pk).toString('base64'),
            "partial_multisig": partial,
            "wallet_password": pw
        };
        let res = await c.post("/v1/multisig/sign", req);
        return res.body;
    };

    /**
     * deleteMultisig accepts a wallet handle, wallet password, and multisig
     * address, and deletes the information about this multisig address from the 
     * wallet (including address and secret key).
     * @param walletHandle
     * @param walletPassword
     * @param addr
     * @returns {Promise<*>}
     */
    this.deleteMultisig = async function (walletHandle, walletPassword, addr) {
        let req = {
            "wallet_handle_token": walletHandle,
            "address": addr,
            "wallet_password": walletPassword
        };
        let res = await c.delete("/v1/multisig", req);
        return res.body;
    };
}
module.exports = {Kmd};


module.exports = {Kmd};