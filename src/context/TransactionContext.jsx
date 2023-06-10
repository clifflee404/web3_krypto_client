import React, { useEffect, useState } from "react"
import { ethers } from "ethers"
import { contractABI, contractAddress } from "../utils/constants"
export const TransactionContext = React.createContext()

const { ethereum } = window

const createEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum)
  const signer = provider.getSigner()
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractABI,
    signer
  )

  // console.log(provider, signer, transactionContract)
  return transactionContract
}

export const TransactionProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState("")
  const [formData, setFormData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [transactionCount, setTransactionCount] = useState(
    localStorage.getItem("transactionCount")
  )
  const [transactions, setTransactions] = useState([])

  // 交易信息表单数据变更
  const handleChange = (e, name) => {
    // console.log('handlechange:', e, name);
    setFormData((prevState) => ({
      ...prevState,
      [name]: e.target.value,
    }))
  }

  // 获取所有交易
  const getAllTransactions = async () => {
    try {
      if (ethereum) {
        const transactionsContract = createEthereumContract()

        const availableTransactions =
          await transactionsContract.getAllTransactions()

        const structuredTransactions = availableTransactions.map(
          (transaction) => ({
            addressTo: transaction.receiver,
            addressFrom: transaction.sender,
            timestamp: new Date(
              transaction.timestamp.toNumber() * 1000
            ).toLocaleString(),
            message: transaction.message,
            keyword: transaction.keyword,
            amount: parseInt(transaction.amount._hex) / 10 ** 18,
          })
        )

        console.log("---structuredTransactions", structuredTransactions)

        setTransactions(structuredTransactions)
      } else {
        console.log("Ethereum is not present")
      }
    } catch (error) {
      console.log(error)
    }
  }

  // 判断钱包是否连接
  const checkIfWalletIsConnected = async () => {
    try {
      if (!ethereum) return alert("请安装 MetaMask 钱包")

      const accounts = await ethereum.request({ method: "eth_accounts" })

      if (accounts.length) {
        setCurrentAccount(accounts[0])
        getAllTransactions()
      } else {
        console.log("No accounts found")
      }

      console.log(accounts)
    } catch (error) {
      console.log(error)
    }
  }

  // 判断是否有历史交易订单存在
  const checkIfTransactionsExists = async () => {
    try {
      if (ethereum) {
        const transactionsContract = createEthereumContract()
        const currentTransactionCount =
          await transactionsContract.getTransactionCount()

        window.localStorage.setItem("transactionCount", currentTransactionCount)
      }
    } catch (error) {
      console.log(error)

      throw new Error("No ethereum object")
    }
  }

  // 连接钱包
  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("请安装 MetaMask 钱包")

      const accounts = await ethereum.request({ method: "eth_requestAccounts" })

      setCurrentAccount(accounts[0])
    } catch (error) {
      console.log(error)
      throw new Error("No ethereum object.")
    }
  }

  // 发送交易
  const sendTransaction = async () => {
    try {
      if (ethereum) {
        const { addressTo, amount, keyword, message } = formData
        const transactionsContract = createEthereumContract()
        const parsedAmount = ethers.utils.parseEther(amount)

        await ethereum.request({
          method: "eth_sendTransaction",
          params: [
            {
              from: currentAccount,
              to: addressTo,
              gas: "0x5208",
              value: parsedAmount._hex,
            },
          ],
        })

        const transactionHash = await transactionsContract.addToBlockchain(
          addressTo,
          parsedAmount,
          message,
          keyword
        )

        setIsLoading(true)
        console.log(`Loading - ${transactionHash.hash}`)
        await transactionHash.wait()
        console.log(`Success - ${transactionHash.hash}`)
        setIsLoading(false)

        const transactionsCount =
          await transactionsContract.getTransactionCount()

        setTransactionCount(transactionsCount.toNumber())
        window.location.reload()
      } else {
        console.log("No ethereum object")
      }
    } catch (error) {
      console.log(error)

      throw new Error("No ethereum object")
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected()
    checkIfTransactionsExists()
  }, [transactionCount])

  return (
    <TransactionContext.Provider
      value={{
        transactionCount,
        transactions,
        currentAccount,
        isLoading,
        formData,
        connectWallet,
        sendTransaction,
        handleChange,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}
