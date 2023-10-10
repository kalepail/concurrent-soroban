import { Server, Transaction } from 'soroban-client'
import { Keypair, Networks, Transaction as Txn, TransactionBuilder, Contract, Address, Operation, TimeoutInfinite, authorizeEntry } from 'stellar-base'

const rpcUrl = 'https://rpc-futurenet.stellar.org'
const contractId = 'CBQ4PHS7PIMHNUOLTYXVZB7MLX4XUVJQD6AZAGJCWGZOBWRNYPQ6W4FH'
const server = new Server(rpcUrl)

const user = Keypair.fromSecret('SAOTVQ3T4GTKQ4NVVHPVJMPVUWXAJZQJLRHX7VHAHI575YNJ3X5MJOUM')
const xlm = 'CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT'

const channels = [
    Keypair.fromSecret("SBCZK5F4KSKYNEYDMFBKNXGIRM3KEDMLVIGISQLW7WMUBIZFBGQIKZLW"),
    Keypair.fromSecret("SCU5ARIPFQXMVZIYDQ6KMGLCB6GUZNTE6WDJT5OBOT63GOACR3ODZCDW"),
    Keypair.fromSecret("SAWWHHD6LS2UJTLBLDEHMADJUELEOEWEYASLNW7A7TVIOZLA2S47XNAU"),
    Keypair.fromSecret("SB6EOKRVMHNSVQ5JW7O3A5UANAT4N2H6XWSHLT27WS6PBUKWIZG2PWUK"),
    Keypair.fromSecret("SCOM2GJBEE46VTP7Y5POEVWEVLSOUQOW3UUIQKJAJABKQNWKHUIA3CJK"),
    Keypair.fromSecret("SBNF66RJJDML3FKFSISK2AJTMKYBC45LUDVIYAIJDUG5TNJVDGSDYUIH"),
    Keypair.fromSecret("SBACYRNRH436UYQ7ATHSFGNDD5DBN3C42LSQLUF7QTUG5DCSR42XLE7Q"),
    Keypair.fromSecret("SBUNUNXYXH4PPDA2RM673JPASWT4FX22BWBJ573SYT2UQN7SETJFGQ4Z"),
    Keypair.fromSecret("SCVCEGR25X27XKP7JKFDFNKX3FUZP6VWOECWXF52C7T3FFID7PXD3FOQ"),
    Keypair.fromSecret("SCLRI4HPEB3HECAI5CNPEN4SKIRJLDBZRRNQOSXB7TVEPL5HNIK53VYC"),
    Keypair.fromSecret("SAATA4U7KBU2LGHAFQWVTTEZZANIFAS2N6EEADWD4NLQ4BBY27K5H3RG"),
    Keypair.fromSecret("SC4ICTOLWENAVR33TYFWLQ3J6RGVEUAUARFWACGLOQCTSZM5V5A3VSQ6"),
    Keypair.fromSecret("SCRLLZZGQF6CYYAHJP22IGKTJRLS74BAMJDNF3CDIEVQZSF2LZHE5FLV"),
    Keypair.fromSecret("SBVWS5UL5WCKTAHYD7XNZT4PIZIKP2Y3EZM2PY4MDRSBSHER4U26OSWD"),
    Keypair.fromSecret("SBBMHV6LZHTTHODJN2KAU4VM274Q6ZAZWK7DNWJEOW6WWM2Y2KATGB7I"),
    Keypair.fromSecret("SC7ED3S5HNEU554LACR66MQZVCIXWM76JFE6YG44YDRYITKI5RTCQHE2"),
    Keypair.fromSecret("SDNKBIBEFW6CKZGS7X6EWW6CWD36FPQSVTFADDAVCA6LLL6T6OUSAWSQ"),
    Keypair.fromSecret("SA2HIQASY4ATYA5U2CRDZDP4YAEORDP7V5L7HCIGYUWEN6F2PG7FP7J4"),
    Keypair.fromSecret("SDX7OM5AQTIBULRPK5YIUCJGUUCC4KYFYI6IAM6IC77VRZNDUZEFML7W"),
    Keypair.fromSecret("SCQBLLFLAVBA2QCMV6ZCNODIYJW6DE7XDXMLWVDEOOUGV5PQ6S6IUYWF")
]

const contract = new Contract(contractId)

let i = 0

for (const key of channels) {
    const source = await server.getAccount(key.publicKey())

    const operation = contract.call(
        "run",
        Address.account(user.rawPublicKey()).toScVal(),
        Address.fromString(xlm).toScVal()
    )

    const tx = new TransactionBuilder(source, {
        fee: (10_000_000 + (i * 100_000)).toString(),
        networkPassphrase: Networks.FUTURENET,
    })
        .addOperation(operation)
        .setTimeout(TimeoutInfinite)
        .build()

    const simTx = await server.simulateTransaction(tx)
    const currentLedger = await server.getLatestLedger()
    const validUntilLedger = currentLedger.sequence + 10000

    const authEntry = await authorizeEntry(
        simTx.result.auth[0],
        user,
        validUntilLedger,
        Networks.FUTURENET,
    )

    const operationAuthorized = Operation.invokeHostFunction({
        func: operation.body().value().hostFunction(),
        auth: [authEntry]
    })

    let builder = TransactionBuilder.cloneFrom(tx);
    builder.operations = [];

    const built = builder
        .addOperation(operationAuthorized)
        // .setSorobanData(simTx
        //     .transactionData
        //     // Have to reset the fees because the initial simulation doesn't account for signing
        //     .setRefundableFee(100_000)
        //     .setResources(100_000_000, 133_120, 66_560)
        //     .build()
        // )
        .setTimeout(TimeoutInfinite)
        .build();
    
    // let readyTx = new Txn(built.toXDR(), Networks.FUTURENET);

    let readyTx = new Transaction(built.toXDR(), Networks.FUTURENET);

    readyTx = await server.prepareTransaction(readyTx, Networks.FUTURENET);

    readyTx = new Txn(readyTx.toXDR(), Networks.FUTURENET);

    readyTx.sign(key);
    // built.sign(key);

    // console.log('sim_x2', readyTx.toXDR());
    // console.log('sim_x1', built.toXDR());
    // break

    await sendTransaction(key, readyTx)
    // await sendTransaction(key, built)
    i++
}

function sendTransaction(key, readyTx) {
    return server.sendTransaction(readyTx)
    .then(async (res) => {
        if (res.status === "TRY_AGAIN_LATER") {
            console.log('retry');
            await new Promise((resolve) => setTimeout(resolve, 1000))
            return sendTransaction(key, readyTx)
        }   

        if (res.status !== "PENDING")
            return console.log(res)

        let j = 0

        const hash = res.hash;

        console.log(key.publicKey(), hash, res.status);

        const interval = setInterval(async () => {
            if (j >= 30) {
                j = 0
                console.log('timeout');
                clearInterval(interval);
                return sendTransaction(key, readyTx)
            }

            const res = await server.getTransaction(hash);

            if (res.status !== "NOT_FOUND")
                clearInterval(interval);

            console.log(key.publicKey(), hash, res.status);

            if (res.status === "FAILED")
                console.log(res);

            j++
        }, 1000);
    })
    .catch((err) => console.error(err))
}

// Types are messed up a bit
// getTransaction FAILED is not returning XDR stuff
// Nonce cloning from authorizeInvocation to footprint