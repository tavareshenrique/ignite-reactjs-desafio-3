import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface ProductAPI {
  id: number;
  title: string;
  price: number;
  image: string;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stockData } = await api.get<Stock>(`stock/${productId}`);

      const productExistsInCart = cart.find(
        (productCart) => productCart.id === productId
      );

      const amount = productExistsInCart ? productExistsInCart.amount + 1 : 1;

      if (amount > stockData.amount) {
        toast.error("Quantidade solicitada fora de estoque");

        return;
      }

      if (productExistsInCart) {
        const addNewProduct = cart.map((productCart) => {
          if (productCart.id === productId) {
            return {
              ...productExistsInCart,
              amount: productCart.amount + 1,
            };
          }

          return productCart;
        });
        setCart(addNewProduct);

        localStorage.setItem(
          "@RocketShoes:cart",
          JSON.stringify(addNewProduct)
        );

        return;
      }

      const { data: productData } = await api.get<ProductAPI>(
        `products/${productId}`
      );

      const newProductToAddInCart = {
        ...productData,
        amount: 1,
      };

      const productsArray = [...cart, { ...newProductToAddInCart }];

      setCart(productsArray);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(productsArray));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find((cartItem) => cartItem.id === productId);

      if (!productExists) {
        throw new Error("Produto não encontrado no carrinho");
      }

      const cartListWithoutRemovedProduct = cart.filter(
        (cartItem) => cartItem.id !== productId
      );

      setCart(cartListWithoutRemovedProduct);

      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(cartListWithoutRemovedProduct)
      );
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        throw new Error("Alteraçáo inválida");
      }

      const { data: stockData } = await api.get(`/stock/${productId}`);

      if (stockData.amount <= amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updateProductAmountItens = cart.map((productCart) => {
        if (productCart.id === productId) {
          return {
            ...productCart,
            amount,
          };
        }

        return productCart;
      });

      setCart(updateProductAmountItens);
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(updateProductAmountItens)
      );
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
